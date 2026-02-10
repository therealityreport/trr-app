import "server-only";
import { query as pgQuery } from "@/lib/server/postgres";
import {
  getPhotoIdsByPersonId,
  getTagsByPhotoIds,
} from "@/lib/server/admin/cast-photo-tags-repository";
import { dedupePhotosByCanonicalKeysPreferMediaLinks } from "@/lib/server/trr-api/person-photo-utils";

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

  // Collect all image IDs
  const imageIds = shows.flatMap((show) =>
    [show.primary_poster_image_id, show.primary_backdrop_image_id, show.primary_logo_image_id]
      .filter((id): id is string => id !== null)
  );

  if (imageIds.length === 0) return;

  try {
    const result = await pgQuery<{ id: string; hosted_url: string | null }>(
      `SELECT id, hosted_url
       FROM core.show_images
       WHERE id = ANY($1::uuid[])`,
      [imageIds]
    );
    const imageMap = new Map(result.rows.map((img) => [img.id, img.hosted_url]));

    // Enrich each show
    for (const show of shows) {
      show.poster_url = show.primary_poster_image_id ? imageMap.get(show.primary_poster_image_id) ?? null : null;
      show.backdrop_url = show.primary_backdrop_image_id ? imageMap.get(show.primary_backdrop_image_id) ?? null : null;
      show.logo_url = show.primary_logo_image_id ? imageMap.get(show.primary_logo_image_id) ?? null : null;
    }
  } catch (error) {
    console.warn("[trr-shows-repository] Failed to enrich shows with image URLs", error);
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
  const like = `%${query}%`;

  const result = await pgQuery<TrrShow>(
    `SELECT
       s.*,
       poster.hosted_url AS poster_url,
       backdrop.hosted_url AS backdrop_url,
       logo.hosted_url AS logo_url
     FROM core.shows AS s
     LEFT JOIN core.show_images AS poster ON poster.id = s.primary_poster_image_id
     LEFT JOIN core.show_images AS backdrop ON backdrop.id = s.primary_backdrop_image_id
     LEFT JOIN core.show_images AS logo ON logo.id = s.primary_logo_image_id
     WHERE s.name ILIKE $1
        OR EXISTS (
          SELECT 1
          FROM unnest(COALESCE(s.alternative_names, ARRAY[]::text[])) AS alt(name)
          WHERE alt.name ILIKE $1
        )
     ORDER BY s.name ASC
     LIMIT $2 OFFSET $3`,
    [like, limit, offset]
  );

  return result.rows;
}

/**
 * Get a single show by ID.
 * Fetches image URLs from show_images table based on primary_*_image_id fields.
 */
export async function getShowById(id: string): Promise<TrrShow | null> {
  const result = await pgQuery<TrrShow>(
    `SELECT
       s.*,
       poster.hosted_url AS poster_url,
       backdrop.hosted_url AS backdrop_url,
       logo.hosted_url AS logo_url
     FROM core.shows AS s
     LEFT JOIN core.show_images AS poster ON poster.id = s.primary_poster_image_id
     LEFT JOIN core.show_images AS backdrop ON backdrop.id = s.primary_backdrop_image_id
     LEFT JOIN core.show_images AS logo ON logo.id = s.primary_logo_image_id
     WHERE s.id = $1::uuid
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

/**
 * Get a show by IMDB ID.
 * Fetches image URLs from show_images table based on primary_*_image_id fields.
 */
export async function getShowByImdbId(imdbId: string): Promise<TrrShow | null> {
  const result = await pgQuery<TrrShow>(
    `SELECT
       s.*,
       poster.hosted_url AS poster_url,
       backdrop.hosted_url AS backdrop_url,
       logo.hosted_url AS logo_url
     FROM core.shows AS s
     LEFT JOIN core.show_images AS poster ON poster.id = s.primary_poster_image_id
     LEFT JOIN core.show_images AS backdrop ON backdrop.id = s.primary_backdrop_image_id
     LEFT JOIN core.show_images AS logo ON logo.id = s.primary_logo_image_id
     WHERE s.imdb_id = $1::text
     LIMIT 1`,
    [imdbId]
  );
  return result.rows[0] ?? null;
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
  const result = await pgQuery<TrrSeason>(
    `SELECT *
     FROM core.seasons
     WHERE show_id = $1::uuid
     ORDER BY season_number DESC
     LIMIT $2 OFFSET $3`,
    [showId, limit, offset]
  );
  return result.rows;
}

/**
 * Get a single season by ID.
 */
export async function getSeasonById(seasonId: string): Promise<TrrSeason | null> {
  const result = await pgQuery<TrrSeason>(
    `SELECT *
     FROM core.seasons
     WHERE id = $1::uuid
     LIMIT 1`,
    [seasonId]
  );
  return result.rows[0] ?? null;
}

/**
 * Get a season by show ID and season number.
 */
export async function getSeasonByShowAndNumber(
  showId: string,
  seasonNumber: number
): Promise<TrrSeason | null> {
  const result = await pgQuery<TrrSeason>(
    `SELECT *
     FROM core.seasons
     WHERE show_id = $1::uuid
       AND season_number = $2::int
     LIMIT 1`,
    [showId, seasonNumber]
  );
  return result.rows[0] ?? null;
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
  const result = await pgQuery<TrrEpisode>(
    `SELECT *
     FROM core.episodes
     WHERE season_id = $1::uuid
     ORDER BY episode_number ASC
     LIMIT $2 OFFSET $3`,
    [seasonId, limit, offset]
  );
  return result.rows;
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
  const result = await pgQuery<TrrEpisode>(
    `SELECT *
     FROM core.episodes
     WHERE show_id = $1::uuid
       AND season_number = $2::int
     ORDER BY episode_number ASC
     LIMIT $3 OFFSET $4`,
    [showId, seasonNumber, limit, offset]
  );
  return result.rows;
}

/**
 * Get a single episode by ID.
 */
export async function getEpisodeById(episodeId: string): Promise<TrrEpisode | null> {
  const result = await pgQuery<TrrEpisode>(
    `SELECT *
     FROM core.episodes
     WHERE id = $1::uuid
     LIMIT 1`,
    [episodeId]
  );
  return result.rows[0] ?? null;
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
  const castResult = await pgQuery<
    Omit<TrrCastMember, "full_name" | "known_for" | "photo_url" | "total_episodes">
  >(
    `SELECT *
     FROM core.v_show_cast
     WHERE show_id = $1::uuid
     ORDER BY billing_order ASC NULLS LAST
     LIMIT $2 OFFSET $3`,
    [showId, limit, offset]
  );

  if (castResult.rows.length === 0) return [];

  const personIds = [...new Set(castResult.rows.map((row) => row.person_id))];

  let peopleMap = new Map<string, { full_name: string | null; known_for: string | null }>();
  try {
    const peopleResult = await pgQuery<{ id: string; full_name: string | null; known_for: string | null }>(
      `SELECT id, full_name, known_for
       FROM core.people
       WHERE id = ANY($1::uuid[])`,
      [personIds]
    );
    peopleMap = new Map(peopleResult.rows.map((p) => [p.id, { full_name: p.full_name, known_for: p.known_for }]));
  } catch (error) {
    console.warn("[trr-shows-repository] getCastByShowId people lookup failed", error);
  }

  const photosMap: Map<string, string> = new Map();
  try {
    const photosResult = await pgQuery<{ person_id: string; hosted_url: string | null }>(
      `SELECT person_id, hosted_url
       FROM core.cast_photos
       WHERE person_id = ANY($1::uuid[])
         AND hosted_url IS NOT NULL
       ORDER BY person_id, gallery_index ASC NULLS LAST`,
      [personIds]
    );
    for (const row of photosResult.rows) {
      const url = row.hosted_url;
      if (url && isLikelyImage(null, url) && !photosMap.has(row.person_id)) {
        photosMap.set(row.person_id, url);
      }
    }
  } catch (error) {
    console.warn("[trr-shows-repository] getCastByShowId cast_photos lookup failed", error);
  }

  return castResult.rows.map((cast) => {
    const person = peopleMap.get(cast.person_id);
    return {
      ...cast,
      full_name: person?.full_name ?? cast.cast_member_name ?? null,
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
  const castResult = await pgQuery<
    Omit<TrrCastMember, "full_name" | "known_for" | "photo_url" | "total_episodes">
  >(
    `SELECT *
     FROM core.v_show_cast
     WHERE show_id = $1::uuid
     ORDER BY billing_order ASC NULLS LAST
     LIMIT $2 OFFSET $3`,
    [showId, limit, offset]
  );

  if (castResult.rows.length === 0) return [];

  const personIds = [...new Set(castResult.rows.map((row) => row.person_id))];

  let peopleMap = new Map<string, { full_name: string | null; known_for: string | null }>();
  try {
    const peopleResult = await pgQuery<{ id: string; full_name: string | null; known_for: string | null }>(
      `SELECT id, full_name, known_for
       FROM core.people
       WHERE id = ANY($1::uuid[])`,
      [personIds]
    );
    peopleMap = new Map(peopleResult.rows.map((p) => [p.id, { full_name: p.full_name, known_for: p.known_for }]));
  } catch (error) {
    console.warn("[trr-shows-repository] getShowCastWithStats people lookup failed", error);
  }

  const totalsMap: Map<string, number> = new Map();
  const nameFallbackMap: Map<string, string> = new Map();
  try {
    const totalsResult = await pgQuery<{ person_id: string; total_episodes: number | null; person_name: string | null }>(
      `SELECT person_id, total_episodes, person_name
       FROM core.v_person_show_seasons
       WHERE show_id = $1::uuid
         AND person_id = ANY($2::uuid[])`,
      [showId, personIds]
    );
    for (const row of totalsResult.rows) {
      if (typeof row.total_episodes === "number") {
        totalsMap.set(row.person_id, row.total_episodes);
      }
      if (row.person_name) {
        nameFallbackMap.set(row.person_id, row.person_name);
      }
    }
  } catch (error) {
    console.warn("[trr-shows-repository] getShowCastWithStats totals lookup failed", error);
  }

  const pickPhotoUrl = (row: {
    display_url?: string | null;
    hosted_url?: string | null;
    url?: string | null;
  }): string | null => {
    const candidates = [row.display_url, row.hosted_url, row.url];
    for (const candidate of candidates) {
      if (candidate && isLikelyImage(null, candidate)) return candidate;
    }
    return null;
  };

  const photosMap: Map<string, string> = new Map();
  try {
    const photosResult = await pgQuery<{
      person_id: string;
      display_url: string | null;
      hosted_url: string | null;
      url: string | null;
    }>(
      `SELECT person_id, display_url, hosted_url, url
       FROM core.v_cast_photos
       WHERE person_id = ANY($1::uuid[])
       ORDER BY person_id, gallery_index ASC NULLS LAST`,
      [personIds]
    );
    for (const row of photosResult.rows) {
      const picked = pickPhotoUrl(row);
      if (picked && !photosMap.has(row.person_id)) {
        photosMap.set(row.person_id, picked);
      }
    }
  } catch (error) {
    console.warn("[trr-shows-repository] getShowCastWithStats photo lookup failed", error);
  }

  return castResult.rows.map((cast) => {
    const person = peopleMap.get(cast.person_id);
    return {
      ...cast,
      full_name: person?.full_name ?? cast.cast_member_name ?? nameFallbackMap.get(cast.person_id) ?? null,
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
  const result = await pgQuery<TrrPerson>(
    `SELECT *
     FROM core.people
     WHERE id = $1::uuid
     LIMIT 1`,
    [personId]
  );
  return result.rows[0] ?? null;
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
  const result = await pgQuery<TrrPerson>(
    `SELECT id, full_name, known_for, external_ids, created_at, updated_at
     FROM core.people
     WHERE full_name ILIKE $1
     ORDER BY full_name ASC
     LIMIT $2 OFFSET $3`,
    [`${query}%`, limit, offset]
  );

  return result.rows;
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

export interface TrrPersonPhoto {
  id: string;
  person_id: string;
  source: string;
  source_image_id?: string | null;
  source_asset_id?: string | null;
  url: string | null;
  hosted_url: string | null;
  hosted_sha256?: string | null;
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
  facebank_seed: boolean;
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

  const person = await getPersonById(personId);
  const fullName = person?.full_name?.trim() ?? null;
  const manualTagPhotoIds = await getPhotoIdsByPersonId(personId);

  // Query 1: Get photos from cast_photos table
  const castPhotosByPersonResult = await pgQuery<
    Pick<
      TrrPersonPhoto,
      | "id"
      | "person_id"
      | "source"
      | "source_image_id"
      | "url"
      | "hosted_url"
      | "hosted_sha256"
      | "hosted_content_type"
      | "caption"
      | "width"
      | "height"
      | "context_section"
      | "context_type"
      | "season"
      | "source_page_url"
      | "people_names"
      | "title_names"
      | "metadata"
      | "fetched_at"
    >
  >(
    `SELECT
       id,
       person_id,
       source,
       source_image_id,
       url,
       hosted_url,
       hosted_sha256,
       hosted_content_type,
       caption,
       width,
       height,
       context_section,
       context_type,
       season,
       source_page_url,
       people_names,
       title_names,
       metadata,
       fetched_at
     FROM core.cast_photos
     WHERE person_id = $1::uuid
       AND hosted_url IS NOT NULL
     ORDER BY source ASC, gallery_index ASC NULLS LAST`,
    [personId]
  );

  let castPhotosByName: TrrPersonPhoto[] = [];
  if (fullName) {
    try {
      const nameResult = await pgQuery<
        Pick<
          TrrPersonPhoto,
          | "id"
          | "person_id"
          | "source"
          | "source_image_id"
          | "url"
          | "hosted_url"
          | "hosted_sha256"
          | "hosted_content_type"
          | "caption"
          | "width"
          | "height"
          | "context_section"
          | "context_type"
          | "season"
          | "source_page_url"
          | "people_names"
          | "title_names"
          | "metadata"
          | "fetched_at"
        >
      >(
        `SELECT
           id,
           person_id,
           source,
           source_image_id,
           url,
           hosted_url,
           hosted_sha256,
           hosted_content_type,
           caption,
           width,
           height,
           context_section,
           context_type,
           season,
           source_page_url,
           people_names,
           title_names,
           metadata,
           fetched_at
         FROM core.cast_photos
         WHERE people_names @> ARRAY[$1]::text[]
           AND hosted_url IS NOT NULL
         ORDER BY source ASC, gallery_index ASC NULLS LAST`,
        [fullName]
      );
      castPhotosByName = nameResult.rows as unknown as TrrPersonPhoto[];
    } catch (error) {
      console.warn("[trr-shows-repository] getPhotosByPersonId cast_photos name lookup failed", error);
    }
  }

  let castPhotosByManualTags: TrrPersonPhoto[] = [];
  if (manualTagPhotoIds.length > 0) {
    try {
      const manualResult = await pgQuery<
        Pick<
          TrrPersonPhoto,
          | "id"
          | "person_id"
          | "source"
          | "source_image_id"
          | "url"
          | "hosted_url"
          | "hosted_sha256"
          | "hosted_content_type"
          | "caption"
          | "width"
          | "height"
          | "context_section"
          | "context_type"
          | "season"
          | "source_page_url"
          | "people_names"
          | "title_names"
          | "metadata"
          | "fetched_at"
        >
      >(
        `SELECT
           id,
           person_id,
           source,
           source_image_id,
           url,
           hosted_url,
           hosted_sha256,
           hosted_content_type,
           caption,
           width,
           height,
           context_section,
           context_type,
           season,
           source_page_url,
           people_names,
           title_names,
           metadata,
           fetched_at
         FROM core.cast_photos
         WHERE id = ANY($1::uuid[])
           AND hosted_url IS NOT NULL
         ORDER BY source ASC, gallery_index ASC NULLS LAST`,
        [manualTagPhotoIds]
      );
      castPhotosByManualTags = manualResult.rows as unknown as TrrPersonPhoto[];
    } catch (error) {
      console.warn(
        "[trr-shows-repository] getPhotosByPersonId cast_photos manual tag lookup failed",
        error
      );
    }
  }

  const castPhotos = [
    ...(castPhotosByPersonResult.rows as unknown as TrrPersonPhoto[]),
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
    const md = (normalizedFandom.metadata ?? {}) as Record<string, unknown>;
    const mdPeopleCountRaw = md.people_count;
    const mdPeopleCount =
      typeof mdPeopleCountRaw === "number" && Number.isFinite(mdPeopleCountRaw)
        ? Math.max(0, Math.floor(mdPeopleCountRaw))
        : typeof mdPeopleCountRaw === "string" && mdPeopleCountRaw.trim()
          ? Number.parseInt(mdPeopleCountRaw, 10)
          : null;
    const mdPeopleCountSourceRaw = md.people_count_source;
    const mdPeopleCountSource =
      typeof mdPeopleCountSourceRaw === "string" ? mdPeopleCountSourceRaw : null;
    return {
      ...photo,
      source: normalizedFandom.source,
      metadata: normalizedFandom.metadata,
      created_at: (photo as { created_at?: string | null }).created_at ?? photo.fetched_at ?? null,
      people_ids: null,
      people_count: mdPeopleCount,
      people_count_source: mdPeopleCountSource as "auto" | "manual" | null,
      ingest_status: null,
      origin: "cast_photos" as const,
      link_id: null,
      media_asset_id: null,
      facebank_seed: false,
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
  // Use a join so the ordering matches link.position and we only fetch assets with hosted_url.
  let mediaPhotos: TrrPersonPhoto[] = [];
  try {
    const joined = await pgQuery<{
      link_id: string;
      media_asset_id: string;
      facebank_seed: boolean | null;
      context: Record<string, unknown> | null;
      link_created_at: string;
      source: string | null;
      source_asset_id: string | null;
      source_url: string | null;
      hosted_url: string | null;
      hosted_sha256: string | null;
      hosted_content_type: string | null;
      caption: string | null;
      width: number | null;
      height: number | null;
      metadata: Record<string, unknown> | null;
      fetched_at: string | null;
      asset_created_at: string | null;
      ingest_status: string | null;
    }>(
      `SELECT
         ml.id AS link_id,
         ml.media_asset_id,
         ml.facebank_seed,
         ml.context,
         ml.created_at AS link_created_at,
         ma.source,
         ma.source_asset_id,
         ma.source_url,
         ma.hosted_url,
         ma.hosted_sha256,
         ma.hosted_content_type,
         ma.caption,
         ma.width,
         ma.height,
         ma.metadata,
         ma.fetched_at,
         ma.created_at AS asset_created_at,
         ma.ingest_status
       FROM core.media_links AS ml
       JOIN core.media_assets AS ma
         ON ma.id = ml.media_asset_id
       WHERE ml.entity_type = 'person'
         AND ml.entity_id = $1::uuid
         AND ml.kind = 'gallery'
         AND ma.hosted_url IS NOT NULL
       ORDER BY ml.position ASC NULLS LAST`,
      [personId]
    );

    mediaPhotos = joined.rows
      .map((row) => {
        if (!row.hosted_url) return null;
        const context = row.context;
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
            ? ((context as { people_count_source: string }).people_count_source as "auto" | "manual")
            : null;
        const metadataPeopleNames = Array.isArray((row.metadata as { people_names?: unknown } | null)?.people_names)
          ? ((row.metadata as { people_names: unknown }).people_names as string[])
          : null;
        const peopleNames = contextPeopleNames ?? metadataPeopleNames ?? null;
        const normalizedScrape = normalizeScrapeSource(row.source || "web_scrape", row.source_url, row.metadata);
        const normalizedFandom = normalizeFandomSource(normalizedScrape, row.metadata);

        return {
          id: row.link_id,
          person_id: personId,
          source: normalizedFandom.source,
          source_asset_id: row.source_asset_id ?? null,
          url: row.source_url,
          hosted_url: row.hosted_url,
          hosted_sha256: row.hosted_sha256 ?? null,
          hosted_content_type: row.hosted_content_type ?? null,
          caption: row.caption,
          width: row.width,
          height: row.height,
          context_section: (context as { context_section?: string | null } | null)?.context_section ?? null,
          context_type: (context as { context_type?: string | null } | null)?.context_type ?? null,
          season: (context as { season?: number | null } | null)?.season ?? null,
          people_names: peopleNames,
          people_ids: contextPeopleIds,
          people_count: contextPeopleCount,
          people_count_source: contextPeopleCountSource,
          ingest_status: row.ingest_status ?? null,
          title_names: null,
          metadata: normalizedFandom.metadata,
          fetched_at: row.fetched_at,
          created_at: row.asset_created_at ?? row.link_created_at,
          origin: "media_links",
          link_id: row.link_id,
          media_asset_id: row.media_asset_id,
          facebank_seed: Boolean(row.facebank_seed),
        } as TrrPersonPhoto;
      })
      .filter((p): p is TrrPersonPhoto => p !== null);
  } catch (error) {
    console.warn("[trr-shows-repository] getPhotosByPersonId media_links/assets lookup failed", error);
  }

  if (mediaPhotos.length > 0) {
    mediaPhotos = mediaPhotos.filter((photo) =>
      isLikelyImage(photo.hosted_content_type, photo.hosted_url)
    );
  }

  // Merge both sources, cast_photos first then media_links
  const allPhotos = [...(castPhotosWithTags ?? []) as TrrPersonPhoto[], ...mediaPhotos];

  // Deduplicate by canonical identity (source IDs / sha / hosted_url),
  // preferring media_links rows when collisions occur.
  const dedupedPhotos = dedupePhotosByCanonicalKeysPreferMediaLinks(allPhotos);

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
  const result = await pgQuery<TrrPersonCredit>(
    `SELECT id, show_id, person_id, show_name, role, billing_order, credit_category
     FROM core.v_show_cast
     WHERE person_id = $1::uuid
     ORDER BY billing_order ASC NULLS LAST
     LIMIT $2 OFFSET $3`,
    [personId, limit, offset]
  );

  return result.rows;
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
  const castResult = await pgQuery<{
    person_id: string;
    person_name: string;
    seasons_appeared: number[];
    total_episodes: number;
  }>(
    `SELECT person_id, person_name, seasons_appeared, total_episodes
     FROM core.v_person_show_seasons
     WHERE show_id = $1::uuid
       AND seasons_appeared @> ARRAY[$2]::int[]
     ORDER BY total_episodes DESC
     LIMIT $3 OFFSET $4`,
    [showId, seasonNumber, limit, offset]
  );

  const typedCastData = castResult.rows;

  if (typedCastData.length === 0) return [];

  // Get person IDs for photo lookup
  const personIds = typedCastData.map((c) => c.person_id);

  // Get photos
  const photosMap: Map<string, string> = new Map();
  try {
    const photoResult = await pgQuery<{ person_id: string; hosted_url: string | null }>(
      `SELECT person_id, hosted_url
       FROM core.cast_photos
       WHERE person_id = ANY($1::uuid[])
         AND hosted_url IS NOT NULL
       ORDER BY person_id, gallery_index ASC NULLS LAST`,
      [personIds]
    );
    for (const photo of photoResult.rows) {
      if (
        photo.hosted_url &&
        isLikelyImage(null, photo.hosted_url) &&
        !photosMap.has(photo.person_id)
      ) {
        photosMap.set(photo.person_id, photo.hosted_url);
      }
    }
  } catch (error) {
    console.warn("[trr-shows-repository] getCastByShowSeason photo lookup failed", error);
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
 * Fallback function when season/episode-level cast views are unavailable.
 * Returns show-level cast from core.v_show_cast without per-season episode counts.
 */
async function getSeasonCastFallbackFromShowCast(
  showId: string,
  options?: PaginationOptions
): Promise<SeasonCastEpisodeCount[]> {
  const { limit, offset } = normalizePagination(options);
  // Query v_show_cast (credits-backed view) for all cast members of this show
  const showCastResult = await pgQuery<{
    person_id: string;
    cast_member_name: string | null;
    billing_order: number | null;
  }>(
    `SELECT person_id, cast_member_name, billing_order
     FROM core.v_show_cast
     WHERE show_id = $1::uuid
     ORDER BY billing_order ASC NULLS LAST`,
    [showId]
  );

  const typedShowCast = showCastResult.rows;

  if (typedShowCast.length === 0) return [];
  const personIds = [...new Set(typedShowCast.map((c) => c.person_id))];

  // Get people names
  let peopleMap = new Map<string, string | null>();
  try {
    const peopleResult = await pgQuery<{ id: string; full_name: string | null }>(
      `SELECT id, full_name
       FROM core.people
       WHERE id = ANY($1::uuid[])`,
      [personIds]
    );
    peopleMap = new Map(peopleResult.rows.map((p) => [p.id, p.full_name]));
  } catch (error) {
    console.warn("[trr-shows-repository] getSeasonCastFallbackFromShowCast people lookup failed", error);
  }

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

  try {
    const viewResult = await pgQuery<{
      person_id: string;
      display_url: string | null;
      hosted_url: string | null;
      url: string | null;
      gallery_index: number | null;
    }>(
      `SELECT person_id, display_url, hosted_url, url, gallery_index
       FROM core.v_cast_photos
       WHERE person_id = ANY($1::uuid[])
       ORDER BY person_id, gallery_index ASC NULLS LAST`,
      [personIds]
    );
    for (const photo of viewResult.rows) {
      const photoUrl = pickPhotoUrl(photo);
      if (photoUrl && !photosMap.has(photo.person_id)) {
        photosMap.set(photo.person_id, photoUrl);
      }
    }
  } catch (error) {
    // Ignore - photos are optional for this fallback.
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
 * Prefers v_season_cast, falls back to v_episode_cast, then v_person_show_seasons for membership-only.
 */
export async function getSeasonCastWithEpisodeCounts(
  showId: string,
  seasonNumber: number,
  options?: PaginationOptions
): Promise<SeasonCastEpisodeCount[]> {
  const { limit, offset } = normalizePagination(options);

  const season = await getSeasonByShowAndNumber(showId, seasonNumber);
  if (!season) return [];

  type PgErrorLike = { code?: string };
  const isMissingRelationOrNoAccess = (error: unknown): boolean => {
    const code = (error as PgErrorLike | null)?.code;
    // 3F000 = invalid_schema_name, 42P01 = undefined_table, 42501 = insufficient_privilege
    return code === "3F000" || code === "42P01" || code === "42501";
  };

  type SeasonCastCountRow = { person_id: string; episodes_in_season: number };
  let seasonCastCounts: SeasonCastCountRow[] | null = null;

  try {
    const result = await pgQuery<SeasonCastCountRow>(
      `SELECT person_id, episodes_in_season
       FROM core.v_season_cast
       WHERE show_id = $1::uuid
         AND season_id = $2::uuid
       ORDER BY episodes_in_season DESC, person_id ASC
       LIMIT $3 OFFSET $4`,
      [showId, season.id, limit, offset]
    );
    seasonCastCounts = result.rows;
  } catch (error) {
    if (!isMissingRelationOrNoAccess(error)) throw error;
  }

  if (seasonCastCounts === null) {
    try {
      const result = await pgQuery<SeasonCastCountRow>(
        `SELECT vec.person_id,
                COUNT(DISTINCT vec.episode_id)::int AS episodes_in_season
         FROM core.v_episode_cast vec
         JOIN core.episodes e ON e.id = vec.episode_id
         WHERE vec.show_id = $1::uuid
           AND e.season_id = $2::uuid
         GROUP BY vec.person_id
         ORDER BY episodes_in_season DESC, vec.person_id ASC
         LIMIT $3 OFFSET $4`,
        [showId, season.id, limit, offset]
      );
      seasonCastCounts = result.rows;
    } catch (error) {
      if (!isMissingRelationOrNoAccess(error)) throw error;
    }
  }

  if (seasonCastCounts === null) {
    try {
      const result = await pgQuery<SeasonCastCountRow>(
        `SELECT person_id,
                COUNT(DISTINCT episode_id)::int AS episodes_in_season
         FROM core.v_episode_credits
         WHERE show_id = $1::uuid
           AND season_number = $2::int
         GROUP BY person_id
         ORDER BY episodes_in_season DESC, person_id ASC
         LIMIT $3 OFFSET $4`,
        [showId, seasonNumber, limit, offset]
      );
      seasonCastCounts = result.rows;
    } catch (error) {
      if (!isMissingRelationOrNoAccess(error)) throw error;
    }
  }

  // If the episode-level views aren't available (or we don't have access), fall back
  // to membership-only results from v_person_show_seasons (no per-season counts).
  if (seasonCastCounts === null) {
    let members: Array<{ person_id: string; person_name: string | null; total_episodes: number | null }> = [];
    try {
      const memberResult = await pgQuery<{
        person_id: string;
        person_name: string | null;
        total_episodes: number | null;
      }>(
        `SELECT person_id, person_name, total_episodes
         FROM core.v_person_show_seasons
         WHERE show_id = $1::uuid
           AND seasons_appeared @> ARRAY[$2]::int[]
         ORDER BY total_episodes DESC
         LIMIT $3 OFFSET $4`,
        [showId, seasonNumber, limit, offset]
      );
      members = memberResult.rows;
    } catch (error) {
      if (isMissingRelationOrNoAccess(error)) {
        return getSeasonCastFallbackFromShowCast(showId, options);
      }
      throw error;
    }

    if (members.length === 0) return [];

    const personIds = members.map((row) => row.person_id);
    const fallbackNames = new Map(members.map((row) => [row.person_id, row.person_name]));
    const totalsMap = new Map<string, number>();
    for (const row of members) {
      if (typeof row.total_episodes === "number") {
        totalsMap.set(row.person_id, row.total_episodes);
      }
    }

    let peopleMap = new Map<string, string | null>();
    try {
      const peopleResult = await pgQuery<{ id: string; full_name: string | null }>(
        `SELECT id, full_name
         FROM core.people
         WHERE id = ANY($1::uuid[])`,
        [personIds]
      );
      peopleMap = new Map(peopleResult.rows.map((p) => [p.id, p.full_name]));
    } catch (error) {
      // Optional - fallback names will be used.
    }

    const pickPhotoUrl = (row: {
      display_url?: string | null;
      hosted_url?: string | null;
      url?: string | null;
    }): string | null => {
      const candidates = [row.display_url, row.hosted_url, row.url];
      for (const candidate of candidates) {
        if (candidate && isLikelyImage(null, candidate)) return candidate;
      }
      return null;
    };

    const photosMap: Map<string, string> = new Map();
    try {
      const photosResult = await pgQuery<{
        person_id: string;
        display_url: string | null;
        hosted_url: string | null;
        url: string | null;
        gallery_index: number | null;
      }>(
        `SELECT person_id, display_url, hosted_url, url, gallery_index
         FROM core.v_cast_photos
         WHERE person_id = ANY($1::uuid[])
         ORDER BY person_id, gallery_index ASC NULLS LAST`,
        [personIds]
      );
      for (const photo of photosResult.rows) {
        const picked = pickPhotoUrl(photo);
        if (picked && !photosMap.has(photo.person_id)) {
          photosMap.set(photo.person_id, picked);
        }
      }
    } catch (error) {
      // Optional - photos are not required.
    }

    return members.map((member) => ({
      person_id: member.person_id,
      person_name: peopleMap.get(member.person_id) ?? fallbackNames.get(member.person_id) ?? null,
      episodes_in_season: 0,
      total_episodes: totalsMap.get(member.person_id) ?? null,
      photo_url: photosMap.get(member.person_id) ?? null,
    }));
  }

  if (seasonCastCounts.length === 0) return [];

  const personIds = seasonCastCounts.map((row) => row.person_id);

  const fallbackNames = new Map<string, string | null>();
  const totalsMap = new Map<string, number>();
  try {
    const totalsResult = await pgQuery<{
      person_id: string;
      person_name: string | null;
      total_episodes: number | null;
    }>(
      `SELECT person_id, person_name, total_episodes
       FROM core.v_person_show_seasons
       WHERE show_id = $1::uuid
         AND person_id = ANY($2::uuid[])`,
      [showId, personIds]
    );
    for (const row of totalsResult.rows) {
      if (!fallbackNames.has(row.person_id)) {
        fallbackNames.set(row.person_id, row.person_name ?? null);
      }
      if (typeof row.total_episodes === "number") {
        const existing = totalsMap.get(row.person_id);
        if (existing === undefined || row.total_episodes > existing) {
          totalsMap.set(row.person_id, row.total_episodes);
        }
      }
    }
  } catch (error) {
    // Optional - totals are best-effort.
  }

  let peopleMap = new Map<string, string | null>();
  try {
    const peopleResult = await pgQuery<{ id: string; full_name: string | null }>(
      `SELECT id, full_name
       FROM core.people
       WHERE id = ANY($1::uuid[])`,
      [personIds]
    );
    peopleMap = new Map(peopleResult.rows.map((p) => [p.id, p.full_name]));
  } catch (error) {
    // Optional - fallback names will be used.
  }

  const pickPhotoUrl = (row: {
    display_url?: string | null;
    hosted_url?: string | null;
    url?: string | null;
  }): string | null => {
    const candidates = [row.display_url, row.hosted_url, row.url];
    for (const candidate of candidates) {
      if (candidate && isLikelyImage(null, candidate)) return candidate;
    }
    return null;
  };

  const photosMap: Map<string, string> = new Map();
  try {
    const photosResult = await pgQuery<{
      person_id: string;
      display_url: string | null;
      hosted_url: string | null;
      url: string | null;
      gallery_index: number | null;
    }>(
      `SELECT person_id, display_url, hosted_url, url, gallery_index
       FROM core.v_cast_photos
       WHERE person_id = ANY($1::uuid[])
       ORDER BY person_id, gallery_index ASC NULLS LAST`,
      [personIds]
    );
    for (const photo of photosResult.rows) {
      const picked = pickPhotoUrl(photo);
      if (picked && !photosMap.has(photo.person_id)) {
        photosMap.set(photo.person_id, picked);
      }
    }
  } catch (error) {
    // Optional - photos are not required.
  }

  return seasonCastCounts.map((member) => ({
    person_id: member.person_id,
    person_name: peopleMap.get(member.person_id) ?? fallbackNames.get(member.person_id) ?? null,
    episodes_in_season: Number.isFinite(member.episodes_in_season) ? member.episodes_in_season : 0,
    total_episodes: totalsMap.get(member.person_id) ?? null,
    photo_url: photosMap.get(member.person_id) ?? null,
  }));
}

// ============================================================================
// Season Assets Functions
// ============================================================================

export interface SeasonAsset {
  id: string;
  type: "season" | "episode" | "cast" | "show";
  // Where the row came from (used for admin actions like archive/star).
  origin_table?: "show_images" | "season_images" | "episode_images" | "cast_photos" | "media_assets";
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
  // Admin gallery should return "everything" by default (up to MAX_LIMIT).
  const { limit } = normalizePagination({
    ...options,
    limit: options?.limit ?? MAX_LIMIT,
  });
  const assets: SeasonAsset[] = [];
  const hostedUrlSeen = new Set<string>();

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

  let seasonId: string | null = null;
  let seasonStartDate: Date | null = null;
  let seasonEndDate: Date | null = null;
  let showImdbId: string | null = null;
  let showName: string | null = null;

  // Season lookup (for season_id + date window)
  try {
    const seasonResult = await pgQuery<{ id: string; premiere_date: string | null; air_date: string | null }>(
      `SELECT id, premiere_date, air_date
       FROM core.seasons
       WHERE show_id = $1::uuid
         AND season_number = $2::int
       LIMIT 1`,
      [showId, seasonNumber]
    );
    const seasonRow = seasonResult.rows[0] ?? null;
    if (seasonRow) {
      seasonId = seasonRow.id;
      const initialStart = seasonRow.premiere_date ?? seasonRow.air_date ?? null;

      if (seasonId) {
        const episodeDates = await pgQuery<{ air_date: string | null }>(
          `SELECT air_date
           FROM core.episodes
           WHERE season_id = $1::uuid
             AND air_date IS NOT NULL
           LIMIT 500`,
          [seasonId]
        );

        const parsedDates = episodeDates.rows
          .map((row) => toDateOnly(row.air_date))
          .filter((date): date is Date => Boolean(date));
        if (parsedDates.length > 0) {
          parsedDates.sort((a, b) => a.getTime() - b.getTime());
          seasonStartDate = parsedDates[0];
          seasonEndDate = parsedDates[parsedDates.length - 1];
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
  } catch (error) {
    console.warn("[trr-shows-repository] getAssetsByShowSeason season lookup failed", error);
  }

  // Show lookup (for imdb id/name filtering)
  try {
    const showResult = await pgQuery<{ name: string | null; external_ids: Record<string, unknown> | null }>(
      `SELECT name, external_ids
       FROM core.shows
       WHERE id = $1::uuid
       LIMIT 1`,
      [showId]
    );
    const showRow = showResult.rows[0] ?? null;
    if (showRow) {
      showName = showRow.name ?? null;
      const externalIds = (showRow.external_ids ?? {}) as Record<string, string | undefined>;
      showImdbId = externalIds.imdb_id ?? externalIds.imdb ?? null;
    }
  } catch (error) {
    console.warn("[trr-shows-repository] getAssetsByShowSeason show lookup failed", error);
  }

  // 0) media_links/media_assets (season)
  if (seasonId) {
    try {
      const linkResult = await pgQuery<{
        link_id: string;
        link_kind: string | null;
        context: Record<string, unknown> | null;
        media_asset_id: string;
        asset_id: string | null;
        source: string | null;
        hosted_url: string | null;
        hosted_content_type: string | null;
        width: number | null;
        height: number | null;
        caption: string | null;
        metadata: Record<string, unknown> | null;
        ingest_status: string | null;
        fetched_at: string | null;
        created_at: string | null;
      }>(
        `SELECT
           ml.id AS link_id,
           ml.kind AS link_kind,
           ml.context,
           ml.media_asset_id,
           ma.id AS asset_id,
           ma.source,
           ma.hosted_url,
           ma.hosted_content_type,
           ma.width,
           ma.height,
           ma.caption,
           ma.metadata,
           ma.ingest_status,
           ma.fetched_at,
           ma.created_at
         FROM core.media_links AS ml
         LEFT JOIN core.media_assets AS ma
           ON ma.id = ml.media_asset_id
         WHERE ml.entity_type = 'season'
           AND ml.entity_id = $1::uuid
         LIMIT 500`,
        [seasonId]
      );

      for (const row of linkResult.rows) {
        const hostedUrl = row.hosted_url ?? null;
        if (!hostedUrl) continue;
        if (!isLikelyImage(null, hostedUrl)) continue;
        if (hostedUrlSeen.has(hostedUrl)) continue;

        const ctx = row.context && typeof row.context === "object" ? row.context : {};
        const mergedMetadata =
          row.metadata && typeof row.metadata === "object"
            ? ({ ...(row.metadata as Record<string, unknown>), ...(ctx as Record<string, unknown>) } as Record<
                string,
                unknown
              >)
            : ({ ...(ctx as Record<string, unknown>) } as Record<string, unknown>);

        const ctxSection =
          typeof (ctx as Record<string, unknown>).context_section === "string"
            ? ((ctx as Record<string, unknown>).context_section as string)
            : null;
        const ctxType =
          typeof (ctx as Record<string, unknown>).context_type === "string"
            ? ((ctx as Record<string, unknown>).context_type as string)
            : null;

        assets.push({
          id: row.asset_id ?? row.media_asset_id,
          type: "season",
          origin_table: "media_assets",
          source: row.source ?? "unknown",
          kind: row.link_kind ?? "other",
          hosted_url: hostedUrl,
          width: row.width ?? null,
          height: row.height ?? null,
          caption: row.caption ?? `Season ${seasonNumber}`,
          season_number: seasonNumber,
          context_section: ctxSection,
          context_type: ctxType,
          fetched_at: row.fetched_at ?? null,
          created_at: row.created_at ?? null,
          metadata: mergedMetadata,
          ingest_status: row.ingest_status ?? null,
          hosted_content_type: row.hosted_content_type ?? null,
        });
        hostedUrlSeen.add(hostedUrl);
      }
    } catch (error) {
      console.warn("[trr-shows-repository] getAssetsByShowSeason media_links lookup failed", error);
    }
  }

  // 1) season_images
  try {
    const seasonImages = await pgQuery<{
      id: string;
      source: string;
      kind: string;
      image_type: string | null;
      hosted_url: string | null;
      width: number | null;
      height: number | null;
      created_at: string | null;
      metadata: Record<string, unknown> | null;
    }>(
      `SELECT id, source, kind, image_type, hosted_url, width, height, created_at, metadata
       FROM core.season_images
       WHERE show_id = $1::uuid
         AND season_number = $2::int
         AND hosted_url IS NOT NULL
       LIMIT 500`,
      [showId, seasonNumber]
    );

    for (const img of seasonImages.rows) {
      if (!img.hosted_url) continue;
      if (hostedUrlSeen.has(img.hosted_url)) continue;
      const imageKind = img.image_type ?? img.kind ?? "poster";
      assets.push({
        id: img.id,
        type: "season",
        origin_table: "season_images",
        source: img.source,
        kind: imageKind,
        hosted_url: img.hosted_url,
        width: img.width,
        height: img.height,
        caption: `Season ${seasonNumber}`,
        season_number: seasonNumber,
        created_at: img.created_at,
        ingest_status: null,
        metadata: img.metadata,
      });
      hostedUrlSeen.add(img.hosted_url);
    }
  } catch (error) {
    console.warn("[trr-shows-repository] getAssetsByShowSeason season_images lookup failed", error);
  }

  // 2) episode_images
  try {
    const episodeImages = await pgQuery<{
      id: string;
      source: string;
      kind: string;
      image_type: string | null;
      hosted_url: string | null;
      width: number | null;
      height: number | null;
      episode_number: number;
      created_at: string | null;
      metadata: Record<string, unknown> | null;
    }>(
      `SELECT id, source, kind, image_type, hosted_url, width, height, episode_number, created_at, metadata
       FROM core.episode_images
       WHERE show_id = $1::uuid
         AND season_number = $2::int
         AND hosted_url IS NOT NULL
       ORDER BY episode_number ASC
       LIMIT 500`,
      [showId, seasonNumber]
    );

    for (const img of episodeImages.rows) {
      if (!img.hosted_url) continue;
      if (hostedUrlSeen.has(img.hosted_url)) continue;
      const imageKind = img.image_type ?? img.kind ?? "still";
      assets.push({
        id: img.id,
        type: "episode",
        origin_table: "episode_images",
        source: img.source,
        kind: imageKind,
        hosted_url: img.hosted_url,
        width: img.width,
        height: img.height,
        caption: `Episode ${img.episode_number}`,
        episode_number: img.episode_number,
        season_number: seasonNumber,
        created_at: img.created_at,
        ingest_status: null,
        metadata: img.metadata,
      });
      hostedUrlSeen.add(img.hosted_url);
    }
  } catch (error) {
    console.warn("[trr-shows-repository] getAssetsByShowSeason episode_images lookup failed", error);
  }

  // 3) cast photos for season members (by tag or within season window)
  try {
    const seasonCast = await pgQuery<{ person_id: string; person_name: string }>(
      `SELECT person_id, person_name
       FROM core.v_person_show_seasons
       WHERE show_id = $1::uuid
         AND seasons_appeared @> ARRAY[$2]::int[]
       LIMIT 500`,
      [showId, seasonNumber]
    );

    if (seasonCast.rows.length > 0) {
      const personIds = seasonCast.rows.map((row) => row.person_id);
      const personNameMap = new Map(seasonCast.rows.map((row) => [row.person_id, row.person_name]));

      const castPhotos = await pgQuery<{
        id: string;
        person_id: string;
        source: string;
        hosted_url: string | null;
        hosted_content_type: string | null;
        width: number | null;
        height: number | null;
        caption: string | null;
        context_section: string | null;
        context_type: string | null;
        season: number | null;
        fetched_at: string | null;
        hosted_at: string | null;
        updated_at: string | null;
        title_imdb_ids: string[] | null;
        title_names: string[] | null;
        metadata: Record<string, unknown> | null;
      }>(
        `SELECT
           id,
           person_id,
           source,
           hosted_url,
           hosted_content_type,
           width,
           height,
           caption,
           context_section,
           context_type,
           season,
           fetched_at,
           hosted_at,
           updated_at,
           title_imdb_ids,
           title_names,
           metadata
         FROM core.cast_photos
         WHERE person_id = ANY($1::uuid[])
           AND hosted_url IS NOT NULL
         LIMIT 500`,
        [personIds]
      );

      for (const photo of castPhotos.rows) {
        if (!photo.hosted_url) continue;
        const isSeasonTagged = photo.season === seasonNumber;
        const photoDate = photo.fetched_at ?? photo.hosted_at ?? photo.updated_at ?? null;
        const photoDateOnly = toDateOnly(photoDate);
        const inSeasonWindow =
          seasonStartDate && seasonEndDate && photoDateOnly
            ? photoDateOnly >= seasonStartDate && photoDateOnly <= seasonEndDate
            : false;

        if (!isSeasonTagged && !inSeasonWindow) continue;

        if (photo.title_imdb_ids && photo.title_imdb_ids.length > 0) {
          if (showImdbId && !photo.title_imdb_ids.includes(showImdbId)) continue;
          if (!showImdbId && showName) {
            const normalizedShowName = showName.toLowerCase();
            const matchesShow = photo.title_names?.some((title) =>
              title.toLowerCase().includes(normalizedShowName)
            );
            if (!matchesShow) continue;
          }
        }

        if (!isLikelyImage(photo.hosted_content_type, photo.hosted_url)) continue;
        if (hostedUrlSeen.has(photo.hosted_url)) continue;

        assets.push({
          id: photo.id,
          type: "cast",
          origin_table: "cast_photos",
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
          created_at: null,
          metadata: photo.metadata,
          ingest_status: null,
          hosted_content_type: photo.hosted_content_type,
        });
        hostedUrlSeen.add(photo.hosted_url);
      }
    }
  } catch (error) {
    console.warn("[trr-shows-repository] getAssetsByShowSeason cast asset lookup failed", error);
  }

  // Sort by type priority: season first, then episode, then cast
  const typePriority: Record<string, number> = { season: 0, episode: 1, cast: 2, show: 3 };
  assets.sort((a, b) => {
    const priorityA = typePriority[a.type] ?? 99;
    const priorityB = typePriority[b.type] ?? 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    if (a.episode_number !== undefined && b.episode_number !== undefined) {
      return a.episode_number - b.episode_number;
    }
    return 0;
  });

  return assets.slice(0, limit);
}

/**
 * Get show-level media assets (posters, backdrops, logos) for a show.
 *
 * This is used by the admin "Assets" tab so show images appear alongside season/episode/cast media.
 */
export async function getAssetsByShowId(
  showId: string,
  options?: PaginationOptions
): Promise<SeasonAsset[]> {
  const { limit } = normalizePagination({
    ...options,
    limit: options?.limit ?? MAX_LIMIT,
  });

  const assets: SeasonAsset[] = [];
  const hostedUrlSeen = new Set<string>();

  // 0) media_links/media_assets (show)
  try {
    const linkResult = await pgQuery<{
      link_id: string;
      link_kind: string | null;
      context: Record<string, unknown> | null;
      media_asset_id: string;
      asset_id: string | null;
      source: string | null;
      hosted_url: string | null;
      hosted_content_type: string | null;
      width: number | null;
      height: number | null;
      caption: string | null;
      metadata: Record<string, unknown> | null;
      ingest_status: string | null;
      fetched_at: string | null;
      created_at: string | null;
    }>(
      `SELECT
         ml.id AS link_id,
         ml.kind AS link_kind,
         ml.context,
         ml.media_asset_id,
         ma.id AS asset_id,
         ma.source,
         ma.hosted_url,
         ma.hosted_content_type,
         ma.width,
         ma.height,
         ma.caption,
         ma.metadata,
         ma.ingest_status,
         ma.fetched_at,
         ma.created_at
       FROM core.media_links AS ml
       LEFT JOIN core.media_assets AS ma
         ON ma.id = ml.media_asset_id
       WHERE ml.entity_type = 'show'
         AND ml.entity_id = $1::uuid
       LIMIT 500`,
      [showId]
    );

    for (const row of linkResult.rows) {
      const hostedUrl = row.hosted_url ?? null;
      if (!hostedUrl) continue;
      if (!isLikelyImage(null, hostedUrl)) continue;
      if (hostedUrlSeen.has(hostedUrl)) continue;

      const ctx = row.context && typeof row.context === "object" ? row.context : {};
      const mergedMetadata =
        row.metadata && typeof row.metadata === "object"
          ? ({
              ...(row.metadata as Record<string, unknown>),
              ...(ctx as Record<string, unknown>),
            } as Record<string, unknown>)
          : ({ ...(ctx as Record<string, unknown>) } as Record<string, unknown>);

      const ctxSection =
        typeof (ctx as Record<string, unknown>).context_section === "string"
          ? ((ctx as Record<string, unknown>).context_section as string)
          : null;
      const ctxType =
        typeof (ctx as Record<string, unknown>).context_type === "string"
          ? ((ctx as Record<string, unknown>).context_type as string)
          : null;

      assets.push({
        id: row.asset_id ?? row.media_asset_id,
        type: "show",
        origin_table: "media_assets",
        source: row.source ?? "unknown",
        kind: row.link_kind ?? "other",
        hosted_url: hostedUrl,
        width: row.width ?? null,
        height: row.height ?? null,
        caption: row.caption ?? null,
        context_section: ctxSection,
        context_type: ctxType,
        fetched_at: row.fetched_at ?? null,
        created_at: row.created_at ?? null,
        metadata: mergedMetadata,
        ingest_status: row.ingest_status ?? null,
        hosted_content_type: row.hosted_content_type ?? null,
      });
      hostedUrlSeen.add(hostedUrl);
    }
  } catch (error) {
    console.warn("[trr-shows-repository] getAssetsByShowId media_links lookup failed", error);
  }

  // 1) show_images
  try {
    const showImages = await pgQuery<{
      id: string;
      source: string;
      kind: string;
      image_type: string | null;
      hosted_url: string | null;
      width: number | null;
      height: number | null;
      created_at: string | null;
      metadata: Record<string, unknown> | null;
    }>(
      `SELECT id, source, kind, image_type, hosted_url, width, height, created_at, metadata
       FROM core.show_images
       WHERE show_id = $1::uuid
         AND hosted_url IS NOT NULL
       LIMIT 500`,
      [showId]
    );

    for (const img of showImages.rows) {
      if (!img.hosted_url) continue;
      if (hostedUrlSeen.has(img.hosted_url)) continue;
      const imageKind = img.image_type ?? img.kind ?? "poster";
      assets.push({
        id: img.id,
        type: "show",
        origin_table: "show_images",
        source: img.source,
        kind: imageKind,
        hosted_url: img.hosted_url,
        width: img.width,
        height: img.height,
        caption: null,
        created_at: img.created_at,
        ingest_status: null,
        metadata: img.metadata,
      });
      hostedUrlSeen.add(img.hosted_url);
    }
  } catch (error) {
    console.warn("[trr-shows-repository] getAssetsByShowId show_images lookup failed", error);
  }

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
  const result = await pgQuery<TrrCastFandom>(
    `SELECT *
     FROM core.cast_fandom
     WHERE person_id = $1::uuid
     ORDER BY scraped_at DESC`,
    [personId]
  );
  return result.rows;
}
