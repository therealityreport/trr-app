import "server-only";
import { query as pgQuery } from "@/lib/server/postgres";
import { parseThumbnailCrop } from "@/lib/thumbnail-crop";
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
  alternative_names: string[];
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

export interface UpdateTrrShowInput {
  name?: string;
  description?: string | null;
  premiereDate?: string | null;
  alternativeNames?: string[];
  primaryPosterImageId?: string | null;
  primaryBackdropImageId?: string | null;
  primaryLogoImageId?: string | null;
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
  thumbnail_focus_x?: number | null;
  thumbnail_focus_y?: number | null;
  thumbnail_zoom?: number | null;
  thumbnail_crop_mode?: "manual" | "auto" | null;
  // Stats
  total_episodes?: number | null;
  archive_episode_count?: number | null;
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

const CANONICAL_PROFILE_SOURCES = ["tmdb", "fandom", "manual"] as const;
type CanonicalProfileSource = (typeof CANONICAL_PROFILE_SOURCES)[number];

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

export const toShowSlug = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

export interface ResolvedShowSlug {
  show_id: string;
  slug: string;
  canonical_slug: string;
  show_name: string;
}

/**
 * Resolve a human-readable show slug to a show_id.
 * Supports collision-safe slugs with optional `--{showIdPrefix}` suffix.
 */
export async function resolveShowSlug(slug: string): Promise<ResolvedShowSlug | null> {
  const normalizedInput = toShowSlug(slug);
  if (!normalizedInput) return null;

  const withSuffix = normalizedInput.match(/^(.*)--([0-9a-f]{8})$/i);
  const baseSlug = withSuffix?.[1]?.trim() || normalizedInput;
  const requestedPrefix = withSuffix?.[2]?.toLowerCase() || null;

  const rows = await pgQuery<{ id: string; name: string; slug: string }>(
    `SELECT
       s.id::text AS id,
       s.name,
       lower(
         trim(
           both '-' FROM regexp_replace(
             regexp_replace(COALESCE(s.name, ''), '&', ' and ', 'gi'),
             '[^a-z0-9]+',
             '-',
             'gi'
           )
         )
       ) AS slug
     FROM core.shows AS s
     WHERE lower(
       trim(
         both '-' FROM regexp_replace(
           regexp_replace(COALESCE(s.name, ''), '&', ' and ', 'gi'),
           '[^a-z0-9]+',
           '-',
           'gi'
         )
       )
     ) = $1
     ORDER BY s.id ASC`,
    [baseSlug]
  );

  if (rows.rows.length === 0) return null;

  const candidate =
    (requestedPrefix
      ? rows.rows.find((row) => row.id.toLowerCase().startsWith(requestedPrefix))
      : null) ?? rows.rows[0];

  const hasCollision = rows.rows.length > 1;
  const canonicalSlug = hasCollision
    ? `${baseSlug}--${candidate.id.slice(0, 8).toLowerCase()}`
    : baseSlug;

  return {
    show_id: candidate.id,
    slug: baseSlug,
    canonical_slug: canonicalSlug,
    show_name: candidate.name,
  };
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

/**
 * Update editable fields for a single show.
 */
export async function updateShowById(
  id: string,
  input: UpdateTrrShowInput
): Promise<TrrShow | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}::text`);
    values.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}::text`);
    values.push(input.description);
  }
  if (input.premiereDate !== undefined) {
    updates.push(`premiere_date = $${paramIndex++}::date`);
    values.push(input.premiereDate);
  }
  if (input.alternativeNames !== undefined) {
    updates.push(`alternative_names = $${paramIndex++}::text[]`);
    values.push(input.alternativeNames);
  }
  if (input.primaryPosterImageId !== undefined) {
    updates.push(`primary_poster_image_id = $${paramIndex++}::uuid`);
    values.push(input.primaryPosterImageId);
  }
  if (input.primaryBackdropImageId !== undefined) {
    updates.push(`primary_backdrop_image_id = $${paramIndex++}::uuid`);
    values.push(input.primaryBackdropImageId);
  }
  if (input.primaryLogoImageId !== undefined) {
    updates.push(`primary_logo_image_id = $${paramIndex++}::uuid`);
    values.push(input.primaryLogoImageId);
  }

  if (updates.length === 0) {
    return getShowById(id);
  }

  values.push(id);
  const result = await pgQuery<TrrShow>(
    `UPDATE core.shows AS s
     SET ${updates.join(", ")}
     WHERE s.id = $${paramIndex}::uuid
     RETURNING s.*`,
    values
  );
  const row = result.rows[0] ?? null;
  if (!row) return null;

  // Keep response shape aligned with getShowById.
  const withUrls = await getShowById(row.id);
  return withUrls ?? row;
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

type CastThumbnailFields = Pick<
  TrrCastMember,
  "thumbnail_focus_x" | "thumbnail_focus_y" | "thumbnail_zoom" | "thumbnail_crop_mode"
>;

type PreferredCastPhoto = CastThumbnailFields & {
  url: string;
};

const EMPTY_CAST_THUMBNAIL_FIELDS: CastThumbnailFields = {
  thumbnail_focus_x: null,
  thumbnail_focus_y: null,
  thumbnail_zoom: null,
  thumbnail_crop_mode: null,
};

const toCastThumbnailFields = (value: unknown): CastThumbnailFields => {
  const parsed = parseThumbnailCrop(value, { clamp: true });
  if (!parsed) return EMPTY_CAST_THUMBNAIL_FIELDS;
  return {
    thumbnail_focus_x: parsed.x,
    thumbnail_focus_y: parsed.y,
    thumbnail_zoom: parsed.zoom,
    thumbnail_crop_mode: parsed.mode,
  };
};

async function getPreferredCastPhotoMap(
  personIds: string[],
  options?: { seasonNumber?: number | null }
): Promise<Map<string, PreferredCastPhoto>> {
  const map = new Map<string, PreferredCastPhoto>();
  if (personIds.length === 0) return map;

  const requestedSeason =
    typeof options?.seasonNumber === "number" && Number.isFinite(options.seasonNumber)
      ? Math.trunc(options.seasonNumber)
      : null;

  try {
    const personLinksResult = await pgQuery<{
      person_id: string;
      hosted_url: string | null;
      hosted_content_type: string | null;
      context: Record<string, unknown> | null;
      position: number | null;
      created_at: string | null;
    }>(
      `SELECT
         ml.entity_id::text AS person_id,
         ma.hosted_url,
         ma.hosted_content_type,
         ml.context,
         ml.position,
         ml.created_at
       FROM core.media_links ml
       JOIN core.media_assets ma ON ma.id = ml.media_asset_id
       WHERE ml.entity_type = 'person'
         AND ml.entity_id = ANY($1::uuid[])
         AND ml.kind = 'gallery'
         AND ma.hosted_url IS NOT NULL
       ORDER BY
         ml.entity_id,
         CASE
           WHEN LOWER(COALESCE(ml.context->>'context_section', '')) = 'bravo_profile'
             AND $2::int IS NOT NULL
             AND COALESCE(ml.context->>'season_number', '') ~ '^[0-9]+$'
             AND (ml.context->>'season_number')::int = $2::int
           THEN 0
           WHEN LOWER(COALESCE(ml.context->>'context_section', '')) = 'bravo_profile'
           THEN 1
           WHEN LOWER(COALESCE(ml.context->>'context_section', '')) IN (
             'official season announcement',
             'official_season_announcement'
           )
           THEN 2
           WHEN COALESCE(ml.context->>'people_count', '') ~ '^[0-9]+$'
             AND (ml.context->>'people_count')::int = 1
           THEN 3
           ELSE 4
         END,
         COALESCE(ml.position, 2147483647) ASC,
         ml.created_at DESC`,
      [personIds, requestedSeason]
    );

    for (const row of personLinksResult.rows) {
      if (map.has(row.person_id)) continue;
      if (!row.hosted_url || !isLikelyImage(row.hosted_content_type, row.hosted_url)) continue;
      const context = row.context ?? null;
      const thumbnailCrop =
        context && typeof context === "object"
          ? (context as { thumbnail_crop?: unknown }).thumbnail_crop
          : null;
      map.set(row.person_id, {
        url: row.hosted_url,
        ...toCastThumbnailFields(thumbnailCrop),
      });
    }
  } catch (error) {
    console.warn("[trr-shows-repository] getPreferredCastPhotoMap media_links lookup failed", error);
  }

  const remainingPersonIds = personIds.filter((personId) => !map.has(personId));
  if (remainingPersonIds.length === 0) return map;

  try {
    const castPhotosResult = await pgQuery<{
      person_id: string;
      display_url: string | null;
      hosted_url: string | null;
      url: string | null;
      context_section: string | null;
      season: number | null;
      gallery_index: number | null;
    }>(
      `SELECT
         person_id,
         display_url,
         hosted_url,
         url,
         context_section,
         season,
         gallery_index
       FROM core.v_cast_photos
       WHERE person_id = ANY($1::uuid[])
       ORDER BY
         person_id,
         CASE
           WHEN LOWER(COALESCE(context_section, '')) = 'bravo_profile'
             AND $2::int IS NOT NULL
             AND season = $2::int
           THEN 0
           WHEN LOWER(COALESCE(context_section, '')) = 'bravo_profile'
           THEN 1
           ELSE 2
         END,
         gallery_index ASC NULLS LAST`,
      [remainingPersonIds, requestedSeason]
    );

    for (const row of castPhotosResult.rows) {
      if (map.has(row.person_id)) continue;
      const candidateUrl = row.display_url ?? row.hosted_url ?? row.url;
      if (!candidateUrl || !isLikelyImage(null, candidateUrl)) continue;
      map.set(row.person_id, {
        url: candidateUrl,
        thumbnail_focus_x: null,
        thumbnail_focus_y: null,
        thumbnail_zoom: null,
        thumbnail_crop_mode: null,
      });
    }
  } catch (error) {
    console.warn("[trr-shows-repository] getPreferredCastPhotoMap cast_photos lookup failed", error);
  }

  return map;
}

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
    `SELECT vsc.*
     FROM core.v_show_cast AS vsc
     JOIN (
       SELECT DISTINCT person_id
       FROM core.v_person_show_seasons
       WHERE show_id = $1::uuid
         AND COALESCE(total_episodes, 0) > 0
     ) eligible ON eligible.person_id = vsc.person_id
     WHERE vsc.show_id = $1::uuid
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

  const preferredPhotos = await getPreferredCastPhotoMap(personIds);

  return castResult.rows.map((cast) => {
    const person = peopleMap.get(cast.person_id);
    const photo = preferredPhotos.get(cast.person_id);
    return {
      ...cast,
      full_name: person?.full_name ?? cast.cast_member_name ?? null,
      known_for: person?.known_for ?? null,
      photo_url: photo?.url ?? null,
      thumbnail_focus_x: photo?.thumbnail_focus_x ?? null,
      thumbnail_focus_y: photo?.thumbnail_focus_y ?? null,
      thumbnail_zoom: photo?.thumbnail_zoom ?? null,
      thumbnail_crop_mode: photo?.thumbnail_crop_mode ?? null,
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
  type ShowCastWithEligibleCountRow = Omit<
    TrrCastMember,
    "full_name" | "known_for" | "photo_url" | "total_episodes" | "archive_episode_count"
  > & { eligible_total_episodes: number | null };
  const castResult = await pgQuery<
    ShowCastWithEligibleCountRow
  >(
    `SELECT vsc.*,
            eligible.total_episodes AS eligible_total_episodes
     FROM core.v_show_cast AS vsc
     JOIN (
       SELECT person_id,
              COUNT(DISTINCT episode_id)::int AS total_episodes
       FROM core.v_episode_credits
       WHERE show_id = $1::uuid
         AND COALESCE(appearance_type, 'appears') <> 'archive_footage'
       GROUP BY person_id
       HAVING COUNT(DISTINCT episode_id) > 0
     ) eligible ON eligible.person_id = vsc.person_id
     WHERE vsc.show_id = $1::uuid
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
  const archiveTotalsMap: Map<string, number> = new Map();
  const nameFallbackMap: Map<string, string> = new Map();
  try {
    const totalsResult = await pgQuery<{
      person_id: string;
      total_episodes: number | null;
      archive_episodes: number | null;
      person_name: string | null;
    }>(
      `SELECT person_id,
              COUNT(DISTINCT CASE
                WHEN COALESCE(appearance_type, 'appears') <> 'archive_footage'
                THEN episode_id
              END)::int AS total_episodes,
              COUNT(DISTINCT CASE
                WHEN COALESCE(appearance_type, '') = 'archive_footage'
                THEN episode_id
              END)::int AS archive_episodes,
              MAX(person_name) AS person_name
       FROM core.v_episode_credits
       WHERE show_id = $1::uuid
         AND person_id = ANY($2::uuid[])
       GROUP BY person_id`,
      [showId, personIds]
    );
    for (const row of totalsResult.rows) {
      if (typeof row.total_episodes === "number") {
        totalsMap.set(row.person_id, row.total_episodes);
      }
      if (typeof row.archive_episodes === "number") {
        archiveTotalsMap.set(row.person_id, row.archive_episodes);
      }
      if (row.person_name) {
        nameFallbackMap.set(row.person_id, row.person_name);
      }
    }
  } catch (error) {
    console.warn("[trr-shows-repository] getShowCastWithStats totals lookup failed", error);
  }

  const preferredPhotos = await getPreferredCastPhotoMap(personIds);

  return castResult.rows.map((cast) => {
    const { eligible_total_episodes, ...castRow } = cast;
    const person = peopleMap.get(castRow.person_id);
    const photo = preferredPhotos.get(castRow.person_id);
    return {
      ...castRow,
      full_name:
        person?.full_name ?? castRow.cast_member_name ?? nameFallbackMap.get(castRow.person_id) ?? null,
      known_for: person?.known_for ?? null,
      photo_url: photo?.url ?? null,
      thumbnail_focus_x: photo?.thumbnail_focus_x ?? null,
      thumbnail_focus_y: photo?.thumbnail_focus_y ?? null,
      thumbnail_zoom: photo?.thumbnail_zoom ?? null,
      thumbnail_crop_mode: photo?.thumbnail_crop_mode ?? null,
      total_episodes: totalsMap.get(castRow.person_id) ?? eligible_total_episodes ?? null,
      archive_episode_count: archiveTotalsMap.get(castRow.person_id) ?? null,
    } as TrrCastMember;
  });
}

/**
 * Get show cast members that only have archive-footage episode evidence.
 */
export async function getShowArchiveFootageCast(
  showId: string,
  options?: PaginationOptions
): Promise<TrrCastMember[]> {
  const { limit, offset } = normalizePagination(options);
  const castResult = await pgQuery<
    Omit<TrrCastMember, "full_name" | "known_for" | "photo_url" | "total_episodes" | "archive_episode_count">
  >(
    `SELECT vsc.*
     FROM core.v_show_cast AS vsc
     JOIN (
       SELECT person_id,
              COUNT(DISTINCT CASE
                WHEN COALESCE(appearance_type, 'appears') <> 'archive_footage'
                THEN episode_id
              END)::int AS regular_episodes,
              COUNT(DISTINCT CASE
                WHEN COALESCE(appearance_type, '') = 'archive_footage'
                THEN episode_id
              END)::int AS archive_episodes
       FROM core.v_episode_credits
       WHERE show_id = $1::uuid
       GROUP BY person_id
     ) episode_counts ON episode_counts.person_id = vsc.person_id
     WHERE vsc.show_id = $1::uuid
       AND COALESCE(episode_counts.regular_episodes, 0) = 0
       AND COALESCE(episode_counts.archive_episodes, 0) > 0
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
    console.warn("[trr-shows-repository] getShowArchiveFootageCast people lookup failed", error);
  }

  const archiveTotalsMap: Map<string, number> = new Map();
  const nameFallbackMap: Map<string, string> = new Map();
  try {
    const totalsResult = await pgQuery<{
      person_id: string;
      archive_episodes: number | null;
      person_name: string | null;
    }>(
      `SELECT person_id,
              COUNT(DISTINCT CASE
                WHEN COALESCE(appearance_type, '') = 'archive_footage'
                THEN episode_id
              END)::int AS archive_episodes,
              MAX(person_name) AS person_name
       FROM core.v_episode_credits
       WHERE show_id = $1::uuid
         AND person_id = ANY($2::uuid[])
       GROUP BY person_id`,
      [showId, personIds]
    );
    for (const row of totalsResult.rows) {
      if (typeof row.archive_episodes === "number") {
        archiveTotalsMap.set(row.person_id, row.archive_episodes);
      }
      if (row.person_name) {
        nameFallbackMap.set(row.person_id, row.person_name);
      }
    }
  } catch (error) {
    console.warn("[trr-shows-repository] getShowArchiveFootageCast totals lookup failed", error);
  }

  const preferredPhotos = await getPreferredCastPhotoMap(personIds);

  return castResult.rows.map((cast) => {
    const person = peopleMap.get(cast.person_id);
    const photo = preferredPhotos.get(cast.person_id);
    return {
      ...cast,
      full_name: person?.full_name ?? cast.cast_member_name ?? nameFallbackMap.get(cast.person_id) ?? null,
      known_for: person?.known_for ?? null,
      photo_url: photo?.url ?? null,
      thumbnail_focus_x: photo?.thumbnail_focus_x ?? null,
      thumbnail_focus_y: photo?.thumbnail_focus_y ?? null,
      thumbnail_zoom: photo?.thumbnail_zoom ?? null,
      thumbnail_crop_mode: photo?.thumbnail_crop_mode ?? null,
      total_episodes: 0,
      archive_episode_count: archiveTotalsMap.get(cast.person_id) ?? null,
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

export async function updatePersonCanonicalProfileSourceOrder(
  personId: string,
  sourceOrder: string[]
): Promise<TrrPerson | null> {
  if (sourceOrder.length !== CANONICAL_PROFILE_SOURCES.length) {
    throw new Error("source_order_must_include_all_sources");
  }
  const deduped = [...new Set(sourceOrder)];
  if (deduped.length !== CANONICAL_PROFILE_SOURCES.length) {
    throw new Error("source_order_contains_duplicates");
  }
  const normalized = deduped.map((value) => value.trim().toLowerCase()) as CanonicalProfileSource[];
  if (normalized.some((value) => !CANONICAL_PROFILE_SOURCES.includes(value))) {
    throw new Error("source_order_contains_invalid_source");
  }

  const result = await pgQuery<TrrPerson>(
    `UPDATE core.people
     SET external_ids = jsonb_set(
       COALESCE(external_ids, '{}'::jsonb),
       '{canonical_profile_source_order}',
       to_jsonb($2::text[]),
       true
     ),
     updated_at = now()
     WHERE id = $1::uuid
     RETURNING *`,
    [personId, normalized]
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
  const toDomain = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return null;
    try {
      const hostname = new URL(trimmed).hostname.toLowerCase();
      const normalizedHost = hostname.replace(/^www\./, "");
      return normalizedHost || null;
    } catch {
      const normalized = trimmed
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0]
        .trim();
      if (!normalized || !normalized.includes(".") || /\s/.test(normalized)) return null;
      return normalized;
    }
  };

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
  const metadataDomain =
    getMetadataString(metadata, "source_domain") ??
    getMetadataString(metadata, "sourceDomain") ??
    null;

  const candidateUrl = url ?? metadataUrl ?? metadataDomain;
  const normalizedDomain = toDomain(candidateUrl);
  if (normalizedDomain) {
    return normalizedDomain;
  }

  if (!candidateUrl) {
    const cleaned = lower.replace(/^web[_-]?scrape[:]?/, "").replace(/^www\./, "");
    if (cleaned && cleaned.includes(".")) {
      return cleaned;
    }
    return rawSource;
  }
  return rawSource;
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
  original_url?: string | null;
  display_url?: string | null;
  detail_url?: string | null;
  crop_display_url?: string | null;
  crop_detail_url?: string | null;
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
  thumbnail_focus_x: number | null;
  thumbnail_focus_y: number | null;
  thumbnail_zoom: number | null;
  thumbnail_crop_mode: "manual" | "auto" | null;
}

export interface TrrPersonCredit {
  id: string;
  show_id: string | null;
  person_id: string;
  show_name: string | null;
  role: string | null;
  billing_order: number | null;
  credit_category: string;
  source_type?: string | null;
  external_imdb_id?: string | null;
  external_url?: string | null;
}

interface ImdbNameFilmographyCredit {
  imdb_title_id: string;
  show_name: string;
  external_url: string;
}

const IMDB_NAME_FULLCREDITS_BASE_URL = "https://m.imdb.com/name";
const IMDB_TITLE_BASE_URL = "https://www.imdb.com/title";
const IMDB_TITLE_ANCHOR_RE =
  /<a[^>]+href="(\/title\/(tt\d+)\/\?ref_=([^"]+))"[^>]*>([\s\S]*?)<\/a>/gi;

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, digits: string) => {
      const parsed = Number.parseInt(digits, 10);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : _;
    });
}

async function fetchImdbNameFilmographyCredits(
  imdbPersonId: string
): Promise<ImdbNameFilmographyCredit[]> {
  const trimmedId = imdbPersonId.trim();
  if (!/^nm\d+$/i.test(trimmedId)) return [];

  const url = `${IMDB_NAME_FULLCREDITS_BASE_URL}/${trimmedId}/fullcredits`;
  let html = "";
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "user-agent": "Mozilla/5.0",
        "accept-language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      console.warn("[trr-shows-repository] IMDb fullcredits fetch failed", {
        imdbPersonId: trimmedId,
        status: response.status,
      });
      return [];
    }
    html = await response.text();
  } catch (error) {
    console.warn("[trr-shows-repository] IMDb fullcredits request error", {
      imdbPersonId: trimmedId,
      error,
    });
    return [];
  }

  if (!html.trim()) return [];

  const byTitleId = new Map<string, ImdbNameFilmographyCredit>();
  for (const match of html.matchAll(IMDB_TITLE_ANCHOR_RE)) {
    const imdbTitleId = (match[2] ?? "").trim().toLowerCase();
    const ref = (match[3] ?? "").trim();
    if (!imdbTitleId || byTitleId.has(imdbTitleId)) continue;
    if (!ref.includes("nm_flmg_job_")) continue;
    if (!/_cdt_t_\d+/i.test(ref)) continue;

    const title = decodeHtmlEntities(stripHtml(match[4] ?? "")).replace(/\s+/g, " ").trim();
    if (!title) continue;

    byTitleId.set(imdbTitleId, {
      imdb_title_id: imdbTitleId,
      show_name: title,
      external_url: `${IMDB_TITLE_BASE_URL}/${imdbTitleId}/`,
    });
  }

  return Array.from(byTitleId.values());
}

type ThumbnailCropFields = Pick<
  TrrPersonPhoto,
  "thumbnail_focus_x" | "thumbnail_focus_y" | "thumbnail_zoom" | "thumbnail_crop_mode"
>;

const EMPTY_THUMBNAIL_CROP_FIELDS: ThumbnailCropFields = {
  thumbnail_focus_x: null,
  thumbnail_focus_y: null,
  thumbnail_zoom: null,
  thumbnail_crop_mode: null,
};

const toThumbnailCropFields = (value: unknown): ThumbnailCropFields => {
  const parsed = parseThumbnailCrop(value, { clamp: true });
  if (!parsed) return EMPTY_THUMBNAIL_CROP_FIELDS;
  return {
    thumbnail_focus_x: parsed.x,
    thumbnail_focus_y: parsed.y,
    thumbnail_zoom: parsed.zoom,
    thumbnail_crop_mode: parsed.mode,
  };
};

type PersonPhotoVariantUrls = Pick<
  TrrPersonPhoto,
  "original_url" | "display_url" | "detail_url" | "crop_display_url" | "crop_detail_url"
>;

const pickPersonPhotoVariantUrl = (
  metadata: Record<string, unknown>,
  signature: string,
  variantKey: string
): string | null => {
  const variants = metadata.variants;
  if (!variants || typeof variants !== "object") return null;
  const signatureBucket = (variants as Record<string, unknown>)[signature];
  if (!signatureBucket || typeof signatureBucket !== "object") return null;
  const variantBucket = (signatureBucket as Record<string, unknown>)[variantKey];
  if (!variantBucket || typeof variantBucket !== "object") return null;

  const asRecord = variantBucket as Record<string, unknown>;
  const webp = asRecord.webp;
  if (webp && typeof webp === "object" && typeof (webp as Record<string, unknown>).url === "string") {
    return (webp as Record<string, unknown>).url as string;
  }
  const jpg = asRecord.jpg;
  if (jpg && typeof jpg === "object" && typeof (jpg as Record<string, unknown>).url === "string") {
    return (jpg as Record<string, unknown>).url as string;
  }
  return null;
};

const resolvePersonPhotoVariantUrls = (
  metadata: Record<string, unknown> | null | undefined,
  hostedUrl: string | null | undefined
): PersonPhotoVariantUrls => {
  const fallbackUrl = hostedUrl ?? null;
  const md = metadata && typeof metadata === "object" ? metadata : null;
  if (!md) {
    return {
      original_url: fallbackUrl,
      display_url: fallbackUrl,
      detail_url: fallbackUrl,
      crop_display_url: null,
      crop_detail_url: null,
    };
  }

  const directDisplay =
    typeof md.display_url === "string" && md.display_url.trim().length > 0 ? md.display_url.trim() : null;
  const directDetail =
    typeof md.detail_url === "string" && md.detail_url.trim().length > 0 ? md.detail_url.trim() : null;
  const directCropDisplay =
    typeof md.crop_display_url === "string" && md.crop_display_url.trim().length > 0
      ? md.crop_display_url.trim()
      : null;
  const directCropDetail =
    typeof md.crop_detail_url === "string" && md.crop_detail_url.trim().length > 0
      ? md.crop_detail_url.trim()
      : null;

  const activeCropSignature =
    typeof md.active_crop_signature === "string" && md.active_crop_signature.trim().length > 0
      ? md.active_crop_signature.trim()
      : null;

  const variantDisplay = pickPersonPhotoVariantUrl(md, "base", "card") ?? directDisplay;
  const variantDetail = pickPersonPhotoVariantUrl(md, "base", "detail") ?? directDetail;
  const variantCropDisplay =
    (activeCropSignature ? pickPersonPhotoVariantUrl(md, activeCropSignature, "crop_card") : null) ??
    directCropDisplay;
  const variantCropDetail =
    (activeCropSignature ? pickPersonPhotoVariantUrl(md, activeCropSignature, "crop_detail") : null) ??
    directCropDetail;

  return {
    original_url: fallbackUrl,
    display_url: variantDisplay ?? fallbackUrl,
    detail_url: variantDetail ?? fallbackUrl,
    crop_display_url: variantCropDisplay,
    crop_detail_url: variantCropDetail,
  };
};

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
    const thumbnailCropFields = toThumbnailCropFields(md.thumbnail_crop);
    const variantUrls = resolvePersonPhotoVariantUrls(
      normalizedFandom.metadata,
      photo.hosted_url ?? photo.url
    );
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
      ...variantUrls,
      ...thumbnailCropFields,
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
        const mergedMetadataForSource =
          row.metadata && typeof row.metadata === "object"
            ? ({
                ...(row.metadata as Record<string, unknown>),
                ...(context && typeof context === "object"
                  ? (context as Record<string, unknown>)
                  : {}),
              } as Record<string, unknown>)
            : context && typeof context === "object"
              ? ({ ...(context as Record<string, unknown>) } as Record<string, unknown>)
              : null;
        const sourceUrlForNormalization =
          getMetadataString(mergedMetadataForSource, "source_url") ??
          getMetadataString(mergedMetadataForSource, "source_page_url") ??
          row.source_url;
        const normalizedScrape = normalizeScrapeSource(
          row.source || "web_scrape",
          sourceUrlForNormalization,
          mergedMetadataForSource
        );
        const normalizedFandom = normalizeFandomSource(normalizedScrape, mergedMetadataForSource);
        const contextThumbnailCrop =
          context && typeof context === "object"
            ? (context as { thumbnail_crop?: unknown }).thumbnail_crop
            : null;
        const metadataThumbnailCrop =
          normalizedFandom.metadata && typeof normalizedFandom.metadata === "object"
            ? (normalizedFandom.metadata as { thumbnail_crop?: unknown }).thumbnail_crop
            : null;
        const thumbnailCropFields = toThumbnailCropFields(
          contextThumbnailCrop ?? metadataThumbnailCrop,
        );
        const variantUrls = resolvePersonPhotoVariantUrls(
          normalizedFandom.metadata,
          row.hosted_url,
        );

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
          ...variantUrls,
          ...thumbnailCropFields,
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
  const localResult = await pgQuery<{
    id: string;
    show_id: string;
    person_id: string;
    show_name: string | null;
    role: string | null;
    billing_order: number | null;
    credit_category: string;
    source_type: string | null;
    show_imdb_id: string | null;
  }>(
    `SELECT
       vsc.id,
       vsc.show_id,
       vsc.person_id,
       vsc.show_name,
       vsc.role,
       vsc.billing_order,
       vsc.credit_category,
       vsc.source_type,
       COALESCE(s.imdb_id, sei.external_id) AS show_imdb_id
     FROM core.v_show_cast AS vsc
     LEFT JOIN core.shows AS s
       ON s.id = vsc.show_id
     LEFT JOIN LATERAL (
       SELECT external_id
       FROM core.show_external_ids
       WHERE show_id = vsc.show_id
         AND source_id = 'imdb'
       ORDER BY is_primary DESC, observed_at DESC NULLS LAST, id DESC
       LIMIT 1
     ) AS sei ON TRUE
     WHERE vsc.person_id = $1::uuid
     ORDER BY vsc.billing_order ASC NULLS LAST, vsc.show_name ASC NULLS LAST, vsc.id ASC`,
    [personId]
  );

  const localCredits: TrrPersonCredit[] = localResult.rows.map((row) => ({
    id: row.id,
    show_id: row.show_id,
    person_id: row.person_id,
    show_name: row.show_name,
    role: row.role,
    billing_order: row.billing_order,
    credit_category: row.credit_category,
    source_type: row.source_type,
    external_imdb_id: row.show_imdb_id,
    external_url: row.show_imdb_id ? `${IMDB_TITLE_BASE_URL}/${row.show_imdb_id}/` : null,
  }));

  const personResult = await pgQuery<{ imdb_person_id: string | null }>(
    `SELECT external_ids ->> 'imdb' AS imdb_person_id
     FROM core.people
     WHERE id = $1::uuid
     LIMIT 1`,
    [personId]
  );
  const imdbPersonId = (personResult.rows[0]?.imdb_person_id ?? "").trim();
  if (!imdbPersonId) {
    return localCredits.slice(offset, offset + limit);
  }

  const imdbCredits = await fetchImdbNameFilmographyCredits(imdbPersonId);
  if (imdbCredits.length === 0) {
    return localCredits.slice(offset, offset + limit);
  }

  const imdbTitleIds = imdbCredits.map((credit) => credit.imdb_title_id);
  const mappingResult = await pgQuery<{
    show_id: string;
    show_name: string;
    imdb_title_id: string;
  }>(
    `SELECT DISTINCT ON (imdb_title_id)
       show_id,
       show_name,
       imdb_title_id
     FROM (
       SELECT
         s.id AS show_id,
         s.name AS show_name,
         LOWER(s.imdb_id) AS imdb_title_id
       FROM core.shows AS s
       WHERE s.imdb_id = ANY($1::text[])

       UNION ALL

       SELECT
         s.id AS show_id,
         s.name AS show_name,
         LOWER(sei.external_id) AS imdb_title_id
       FROM core.show_external_ids AS sei
       JOIN core.shows AS s
         ON s.id = sei.show_id
       WHERE sei.source_id = 'imdb'
         AND LOWER(sei.external_id) = ANY($1::text[])
     ) AS mapped
     ORDER BY imdb_title_id, show_id`,
    [imdbTitleIds]
  );

  const showByImdbId = new Map(
    mappingResult.rows.map((row) => [row.imdb_title_id, { show_id: row.show_id, show_name: row.show_name }])
  );

  const localImdbIds = new Set(
    localCredits
      .map((credit) => (credit.external_imdb_id ?? "").trim().toLowerCase())
      .filter((value) => value.length > 0)
  );

  const imdbOnlyCredits: TrrPersonCredit[] = [];
  for (const credit of imdbCredits) {
    const imdbTitleId = credit.imdb_title_id.toLowerCase();
    if (localImdbIds.has(imdbTitleId)) continue;

    const mappedShow = showByImdbId.get(imdbTitleId);
    imdbOnlyCredits.push({
      id: `imdb-${personId}-${imdbTitleId}`,
      show_id: mappedShow?.show_id ?? null,
      person_id: personId,
      show_name: mappedShow?.show_name ?? credit.show_name,
      role: null,
      billing_order: null,
      credit_category: "Self",
      source_type: "imdb_name_fullcredits",
      external_imdb_id: imdbTitleId,
      external_url: credit.external_url,
    });
  }

  imdbOnlyCredits.sort((a, b) => (a.show_name ?? "").localeCompare(b.show_name ?? ""));
  const combined = [...localCredits, ...imdbOnlyCredits];
  return combined.slice(offset, offset + limit);
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
  thumbnail_focus_x?: number | null;
  thumbnail_focus_y?: number | null;
  thumbnail_zoom?: number | null;
  thumbnail_crop_mode?: "manual" | "auto" | null;
}

export interface SeasonCastEpisodeCount {
  person_id: string;
  person_name: string | null;
  episodes_in_season: number;
  total_episodes: number | null;
  photo_url: string | null;
  thumbnail_focus_x?: number | null;
  thumbnail_focus_y?: number | null;
  thumbnail_zoom?: number | null;
  thumbnail_crop_mode?: "manual" | "auto" | null;
  archive_episodes_in_season?: number | null;
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

  const preferredPhotos = await getPreferredCastPhotoMap(personIds, { seasonNumber });

  return typedCastData.map((cast) => ({
    person_id: cast.person_id,
    person_name: cast.person_name,
    seasons_appeared: cast.seasons_appeared,
    total_episodes: cast.total_episodes,
    photo_url: preferredPhotos.get(cast.person_id)?.url ?? null,
    thumbnail_focus_x: preferredPhotos.get(cast.person_id)?.thumbnail_focus_x ?? null,
    thumbnail_focus_y: preferredPhotos.get(cast.person_id)?.thumbnail_focus_y ?? null,
    thumbnail_zoom: preferredPhotos.get(cast.person_id)?.thumbnail_zoom ?? null,
    thumbnail_crop_mode: preferredPhotos.get(cast.person_id)?.thumbnail_crop_mode ?? null,
  }));
}

/**
 * Get cast members who appeared in a specific season with per-season episode counts.
 * Prefers v_season_cast, falls back to v_episode_cast, then v_person_show_seasons for membership-only.
 */
export async function getSeasonCastWithEpisodeCounts(
  showId: string,
  seasonNumber: number,
  options?: PaginationOptions & { includeArchiveOnly?: boolean }
): Promise<SeasonCastEpisodeCount[]> {
  const { limit, offset } = normalizePagination(options);
  const includeArchiveOnly =
    typeof (options as { includeArchiveOnly?: unknown } | undefined)?.includeArchiveOnly === "boolean"
      ? Boolean((options as { includeArchiveOnly?: boolean }).includeArchiveOnly)
      : false;

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
                COUNT(DISTINCT CASE
                  WHEN COALESCE(appearance_type, 'appears') <> 'archive_footage'
                  THEN episode_id
                END)::int AS episodes_in_season
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

  if (seasonCastCounts === null) {
    // Enforce eligibility based on actual episode evidence only.
    return [];
  }

  const evidenceByPerson = new Map<
    string,
    { regular_episodes_in_season: number; archive_episodes_in_season: number }
  >();
  try {
    const evidenceResult = await pgQuery<{
      person_id: string;
      regular_episodes_in_season: number | null;
      archive_episodes_in_season: number | null;
    }>(
      `SELECT person_id,
              COUNT(DISTINCT CASE
                WHEN COALESCE(appearance_type, 'appears') <> 'archive_footage'
                THEN episode_id
              END)::int AS regular_episodes_in_season,
              COUNT(DISTINCT CASE
                WHEN COALESCE(appearance_type, '') = 'archive_footage'
                THEN episode_id
              END)::int AS archive_episodes_in_season
       FROM core.v_episode_credits
       WHERE show_id = $1::uuid
         AND season_number = $2::int
       GROUP BY person_id`,
      [showId, seasonNumber]
    );

    for (const row of evidenceResult.rows) {
      evidenceByPerson.set(row.person_id, {
        regular_episodes_in_season:
          typeof row.regular_episodes_in_season === "number" ? row.regular_episodes_in_season : 0,
        archive_episodes_in_season:
          typeof row.archive_episodes_in_season === "number" ? row.archive_episodes_in_season : 0,
      });
    }
  } catch {
    // Best effort; keep existing season cast counts.
  }

  if (evidenceByPerson.size > 0) {
    seasonCastCounts = seasonCastCounts.map((row) => {
      const evidence = evidenceByPerson.get(row.person_id);
      if (!evidence) return row;
      return {
        ...row,
        episodes_in_season: evidence.regular_episodes_in_season,
      };
    });
  }

  const archiveOnlyRows: SeasonCastCountRow[] = includeArchiveOnly
    ? Array.from(evidenceByPerson.entries())
        .filter(
          ([personId, evidence]) =>
            evidence.regular_episodes_in_season <= 0 &&
            evidence.archive_episodes_in_season > 0 &&
            !seasonCastCounts?.some((row) => row.person_id === personId)
        )
        .map(([personId]) => ({ person_id: personId, episodes_in_season: 0 }))
    : [];

  const normalizedCounts = [...seasonCastCounts, ...archiveOnlyRows];
  const filteredCounts = includeArchiveOnly
    ? normalizedCounts.filter((row) => {
        const evidence = evidenceByPerson.get(row.person_id);
        const regular = evidence?.regular_episodes_in_season ?? row.episodes_in_season ?? 0;
        const archive = evidence?.archive_episodes_in_season ?? 0;
        return regular > 0 || archive > 0;
      })
    : normalizedCounts.filter((row) => (row.episodes_in_season ?? 0) > 0);
  if (filteredCounts.length === 0) return [];

  const personIds = filteredCounts.map((row) => row.person_id);

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
  } catch {
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
  } catch {
    // Optional - fallback names will be used.
  }

  const preferredPhotos = await getPreferredCastPhotoMap(personIds, { seasonNumber });

  return filteredCounts.map((member) => {
    const evidence = evidenceByPerson.get(member.person_id);
    const regularEpisodes =
      evidence?.regular_episodes_in_season ??
      (Number.isFinite(member.episodes_in_season) ? member.episodes_in_season : 0);
    return {
    person_id: member.person_id,
    person_name: peopleMap.get(member.person_id) ?? fallbackNames.get(member.person_id) ?? null,
    episodes_in_season: regularEpisodes,
    total_episodes: totalsMap.get(member.person_id) ?? null,
    photo_url: preferredPhotos.get(member.person_id)?.url ?? null,
    thumbnail_focus_x: preferredPhotos.get(member.person_id)?.thumbnail_focus_x ?? null,
    thumbnail_focus_y: preferredPhotos.get(member.person_id)?.thumbnail_focus_y ?? null,
    thumbnail_zoom: preferredPhotos.get(member.person_id)?.thumbnail_zoom ?? null,
    thumbnail_crop_mode: preferredPhotos.get(member.person_id)?.thumbnail_crop_mode ?? null,
    archive_episodes_in_season: evidence?.archive_episodes_in_season ?? 0,
  };
  });
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
  original_url?: string;
  display_url?: string | null;
  detail_url?: string | null;
  crop_display_url?: string | null;
  crop_detail_url?: string | null;
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

type SeasonAssetVariantUrls = Pick<
  SeasonAsset,
  "original_url" | "display_url" | "detail_url" | "crop_display_url" | "crop_detail_url"
>;

const pickVariantUrlFromSignature = (
  metadata: Record<string, unknown>,
  signature: string,
  variantKey: string
): string | null => {
  const variants = metadata.variants;
  if (!variants || typeof variants !== "object") return null;
  const signatureBucket = (variants as Record<string, unknown>)[signature];
  if (!signatureBucket || typeof signatureBucket !== "object") return null;
  const variantBucket = (signatureBucket as Record<string, unknown>)[variantKey];
  if (!variantBucket || typeof variantBucket !== "object") return null;

  const asRecord = variantBucket as Record<string, unknown>;
  const webp = asRecord.webp;
  if (webp && typeof webp === "object" && typeof (webp as Record<string, unknown>).url === "string") {
    return (webp as Record<string, unknown>).url as string;
  }
  const jpg = asRecord.jpg;
  if (jpg && typeof jpg === "object" && typeof (jpg as Record<string, unknown>).url === "string") {
    return (jpg as Record<string, unknown>).url as string;
  }
  return null;
};

const resolveSeasonAssetVariantUrls = (
  metadata: Record<string, unknown> | null | undefined,
  hostedUrl: string
): SeasonAssetVariantUrls => {
  const md = metadata && typeof metadata === "object" ? metadata : null;
  const directDisplay =
    typeof md?.display_url === "string" && md.display_url.trim().length > 0
      ? md.display_url.trim()
      : null;
  const directDetail =
    typeof md?.detail_url === "string" && md.detail_url.trim().length > 0
      ? md.detail_url.trim()
      : null;
  const directCropDisplay =
    typeof md?.crop_display_url === "string" && md.crop_display_url.trim().length > 0
      ? md.crop_display_url.trim()
      : null;
  const directCropDetail =
    typeof md?.crop_detail_url === "string" && md.crop_detail_url.trim().length > 0
      ? md.crop_detail_url.trim()
      : null;

  const activeCropSignature =
    typeof md?.active_crop_signature === "string" && md.active_crop_signature.trim().length > 0
      ? md.active_crop_signature.trim()
      : null;

  const variantDisplay =
    (md && pickVariantUrlFromSignature(md, "base", "card")) ?? directDisplay;
  const variantDetail =
    (md && pickVariantUrlFromSignature(md, "base", "detail")) ?? directDetail;
  const variantCropDisplay =
    (activeCropSignature && md
      ? pickVariantUrlFromSignature(md, activeCropSignature, "crop_card")
      : null) ?? directCropDisplay;
  const variantCropDetail =
    (activeCropSignature && md
      ? pickVariantUrlFromSignature(md, activeCropSignature, "crop_detail")
      : null) ?? directCropDetail;

  return {
    original_url: hostedUrl,
    display_url: variantDisplay ?? hostedUrl,
    detail_url: variantDetail ?? hostedUrl,
    crop_display_url: variantCropDisplay,
    crop_detail_url: variantCropDetail,
  };
};

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
        source_url: string | null;
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
           ma.source_url,
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
        const sourceUrlForNormalization =
          getMetadataString(mergedMetadata, "source_url") ??
          getMetadataString(mergedMetadata, "source_page_url") ??
          row.source_url ??
          null;
        const normalizedScrape = normalizeScrapeSource(
          row.source ?? "unknown",
          sourceUrlForNormalization,
          mergedMetadata
        );

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
          source: normalizedScrape,
          kind: row.link_kind ?? "other",
          hosted_url: hostedUrl,
          ...resolveSeasonAssetVariantUrls(mergedMetadata, hostedUrl),
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
        ...resolveSeasonAssetVariantUrls(img.metadata, img.hosted_url),
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
        ...resolveSeasonAssetVariantUrls(img.metadata, img.hosted_url),
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
          ...resolveSeasonAssetVariantUrls(photo.metadata, photo.hosted_url),
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
      source_url: string | null;
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
         ma.source_url,
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
      const sourceUrlForNormalization =
        getMetadataString(mergedMetadata, "source_url") ??
        getMetadataString(mergedMetadata, "source_page_url") ??
        row.source_url ??
        null;
      const normalizedScrape = normalizeScrapeSource(
        row.source ?? "unknown",
        sourceUrlForNormalization,
        mergedMetadata
      );

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
        source: normalizedScrape,
        kind: row.link_kind ?? "other",
        hosted_url: hostedUrl,
        ...resolveSeasonAssetVariantUrls(mergedMetadata, hostedUrl),
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
        ...resolveSeasonAssetVariantUrls(img.metadata, img.hosted_url),
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
  const normalizeNameForMatch = (value: string | null | undefined): string => {
    if (!value) return "";
    const noParen = value.replace(/\(.*?\)/g, " ");
    return noParen
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .trim()
      .toLowerCase();
  };
  const namesMatch = (
    expected: string | null | undefined,
    candidate: string | null | undefined
  ): boolean => {
    const expectedNorm = normalizeNameForMatch(expected);
    const candidateNorm = normalizeNameForMatch(candidate);
    if (!expectedNorm || !candidateNorm) return false;
    if (expectedNorm === candidateNorm) return true;
    if (expectedNorm.includes(candidateNorm) || candidateNorm.includes(expectedNorm)) return true;
    const expectedTokens = expectedNorm.split(" ").filter(Boolean);
    const candidateTokens = candidateNorm.split(" ").filter(Boolean);
    if (expectedTokens.length === 0 || candidateTokens.length === 0) return false;
    if (expectedTokens[expectedTokens.length - 1] === candidateTokens[candidateTokens.length - 1]) {
      return true;
    }
    return expectedTokens.some((token) => candidateTokens.includes(token));
  };
  const nameFromFandomUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const idx = parsed.pathname.indexOf("/wiki/");
      if (idx === -1) return null;
      let slug = parsed.pathname.slice(idx + "/wiki/".length);
      if (slug.includes("/")) slug = slug.split("/")[0];
      slug = decodeURIComponent(slug).replace(/_/g, " ").trim();
      if (slug.toLowerCase().endsWith(" gallery")) {
        slug = slug.slice(0, -" gallery".length).trim();
      }
      return slug || null;
    } catch {
      return null;
    }
  };

  const personResult = await pgQuery<{ full_name: string | null }>(
    `SELECT full_name
     FROM core.people
     WHERE id = $1::uuid
     LIMIT 1`,
    [personId]
  );
  const expectedPersonName = personResult.rows[0]?.full_name ?? null;

  const result = await pgQuery<TrrCastFandom>(
    `SELECT *
     FROM core.cast_fandom
     WHERE person_id = $1::uuid
     ORDER BY scraped_at DESC`,
    [personId]
  );
  if (!expectedPersonName) return result.rows;

  const filtered = result.rows.filter((row) =>
    namesMatch(expectedPersonName, row.full_name) ||
    namesMatch(expectedPersonName, row.page_title) ||
    namesMatch(expectedPersonName, nameFromFandomUrl(row.source_url))
  );
  return filtered;
}
