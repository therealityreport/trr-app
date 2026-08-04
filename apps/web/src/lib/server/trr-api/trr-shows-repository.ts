import "server-only";
import { query as pgQuery } from "@/lib/server/postgres";
import {
  isPersonExternalIdSource,
  normalizePersonExternalIdValue,
  type PersonExternalIdInput,
  type PersonExternalIdRecord,
  type PersonExternalIdSource,
} from "@/lib/admin/person-external-ids";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  AdminReadProxyError,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
  type AdminBackendJsonResult,
} from "@/lib/server/trr-api/admin-read-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";
import type { components as PublicApiV2Components } from "@/lib/server/trr-api/generated/openapi.v2";

// ============================================================================
// Types
// ============================================================================

export interface TrrShow {
  id: string;
  name: string;
  slug: string;
  canonical_slug: string;
  alternative_names: string[];
  overview_alternative_names?: string[] | null;
  imdb_id: string | null;
  tmdb_id: number | null;
  external_ids?: Record<string, unknown> | null;
  derived_external_links?: {
    justwatch_url?: string | null;
  } | null;
  overview_watch_availability?:
    | Array<{
        region: "US" | "GB" | "CA" | "AU";
        stream: string[];
        buy: string[];
      }>
    | null;
  watch_provider_regions?:
    | Array<{
        region: string;
        stream: string[];
        free: string[];
        buy_rent: string[];
      }>
    | null;
  show_total_seasons: number | null;
  show_total_episodes: number | null;
  description: string | null;
  premiere_date: string | null;
  genres: string[];
  networks: string[];
  overview_networks?: string[] | null;
  streaming_providers?: string[] | null;
  overview_streaming_providers?: string[] | null;
  watch_providers?: string[] | null;
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
  slug?: string | null;
  description?: string | null;
  premiereDate?: string | null;
  alternativeNames?: string[];
  imdbId?: string | null;
  tmdbId?: number | null;
  externalIds?: Record<string, unknown> | null;
  genres?: string[];
  networks?: string[];
  streamingProviders?: string[];
  tags?: string[];
  primaryPosterImageId?: string | null;
  primaryBackdropImageId?: string | null;
  primaryLogoImageId?: string | null;
}

export type ShowFeaturedImageKind = "poster" | "backdrop";

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
  has_scheduled_or_aired_episode?: boolean;
  episode_airdate_count?: number;
  fandom_source_url?: string | null;
  fandom_page_title?: string | null;
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
  birthday?: Record<string, unknown> | null;
  gender?: Record<string, unknown> | null;
  biography?: Record<string, unknown> | null;
  place_of_birth?: Record<string, unknown> | null;
  homepage?: Record<string, unknown> | null;
  profile_image_url?: Record<string, unknown> | null;
  alternative_names?: Record<string, string[]> | null;
  created_at: string;
  updated_at: string;
}

export interface PersonEffectiveSocialHandles {
  person_id: string;
  facebook_handle: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  twitter_handle: string | null;
  youtube_handle: string | null;
}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

const normalizeOverviewWatchAvailability = (
  value: unknown,
): NonNullable<TrrShow["overview_watch_availability"]> => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const region = String(row.region || "").trim().toUpperCase();
      if (region !== "US" && region !== "GB" && region !== "CA" && region !== "AU") {
        return null;
      }
      return {
        region,
        stream: normalizeStringArray(row.stream),
        buy: normalizeStringArray(row.buy),
      } as const;
    })
    .filter(
      (
        item
      ): item is {
        region: "US" | "GB" | "CA" | "AU";
        stream: string[];
        buy: string[];
      } => item !== null
    );
};

const normalizeWatchProviderRegions = (
  value: unknown,
): NonNullable<TrrShow["watch_provider_regions"]> => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const region = String(row.region || "").trim().toUpperCase();
      if (!region) return null;
      return {
        region,
        stream: normalizeStringArray(row.stream),
        free: normalizeStringArray(row.free),
        buy_rent: normalizeStringArray(row.buy_rent),
      };
    })
    .filter(
      (
        item,
      ): item is {
        region: string;
        stream: string[];
        free: string[];
        buy_rent: string[];
      } => item !== null,
    );
};

const normalizeTrrShowRow = (row: TrrShow): TrrShow => ({
  ...row,
  alternative_names: normalizeStringArray(row.alternative_names),
  overview_alternative_names: normalizeStringArray(row.overview_alternative_names),
  genres: normalizeStringArray(row.genres),
  networks: normalizeStringArray(row.networks),
  overview_networks: normalizeStringArray(row.overview_networks),
  streaming_providers: normalizeStringArray(row.streaming_providers),
  overview_streaming_providers: normalizeStringArray(row.overview_streaming_providers),
  overview_watch_availability: normalizeOverviewWatchAvailability(row.overview_watch_availability),
  watch_provider_regions: normalizeWatchProviderRegions(row.watch_provider_regions),
  watch_providers: normalizeStringArray(row.watch_providers),
  tags: normalizeStringArray(row.tags),
});

type CoreShowV2 = PublicApiV2Components["schemas"]["CoreShowV2"];
type CoreSeasonV2 = PublicApiV2Components["schemas"]["CoreSeasonV2"];
type CoreEpisodeV2 = PublicApiV2Components["schemas"]["CoreEpisodeV2"];
type CoreCastMemberV2 = PublicApiV2Components["schemas"]["CastMemberV2"];
type CoreSeasonCastMemberV2 = PublicApiV2Components["schemas"]["SeasonCastMemberV2"];
type CoreSeasonCastEpisodeCountV2 =
  PublicApiV2Components["schemas"]["SeasonCastEpisodeCountV2"];
type CorePersonCreditV2 = PublicApiV2Components["schemas"]["PersonCreditV2"];
type CorePersonEpisodeCreditV2 = PublicApiV2Components["schemas"]["PersonEpisodeCreditV2"];
type AdminPersonSummaryV2 = PublicApiV2Components["schemas"]["AdminPersonSummaryV2"];
type AdminPersonV2 = PublicApiV2Components["schemas"]["AdminPersonV2"];
type AdminPersonReadV2 = AdminPersonSummaryV2 & Partial<AdminPersonV2>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const buildPaginationQueryString = (
  options: Record<string, string | number | boolean | null | undefined>,
): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null) continue;
    query.set(key, String(value));
  }
  return query.toString();
};

const fetchPublicCoreJson = (
  path: string,
  options: {
    queryString?: string;
    routeName: string;
  },
): Promise<AdminBackendJsonResult> =>
  fetchAdminBackendJson(path, {
    apiVersion: "v2",
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName: options.routeName,
    queryString: options.queryString,
  });

const throwPublicCoreStatusError = (
  upstream: AdminBackendJsonResult,
  routeName: string,
  fallbackMessage: string,
): never => {
  throw buildAdminBackendStatusError({
    status: upstream.status,
    data: upstream.data,
    fallbackMessage,
    routeName,
  });
};

const invalidPublicCoreResponse = (routeName: string): never => {
  throw new AdminReadProxyError("TRR-Backend returned an invalid v2 response", 502, {
    code: "INVALID_BACKEND_RESPONSE",
    retryable: false,
    detail: { route: routeName },
  });
};

type RuntimeFieldValidator = (value: unknown) => boolean;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isNullableString = (value: unknown): boolean => value === null || typeof value === "string";
const isNullableFiniteNumber = (value: unknown): boolean =>
  value === null || isFiniteNumber(value);
const isNullableRecord = (value: unknown): boolean => value === null || isRecord(value);
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(isFiniteNumber);
const isNullableCropMode = (value: unknown): boolean =>
  value === null || value === "auto" || value === "manual";
const isNullableAssetOrigin = (value: unknown): boolean =>
  value === null ||
  value === "show_images" ||
  value === "season_images" ||
  value === "episode_images" ||
  value === "cast_photos" ||
  value === "media_assets";
const isNullableAssetType = (value: unknown): boolean =>
  value === "season" || value === "episode" || value === "cast" || value === "show";
const isStringArrayRecord = (value: unknown): boolean =>
  isRecord(value) && Object.values(value).every(isStringArray);
const isRecordOrStringOrNull = (value: unknown): boolean =>
  value === null || typeof value === "string" || isRecord(value);

const hasOptionalFields = (
  value: Record<string, unknown>,
  fields: Record<string, RuntimeFieldValidator>,
): boolean =>
  Object.entries(fields).every(
    ([key, validator]) =>
      !Object.prototype.hasOwnProperty.call(value, key) || validator(value[key]),
  );

const hasValidPaginationFields = (value: Record<string, unknown>): boolean =>
  hasOptionalFields(value, {
    count: isFiniteNumber,
    has_more: (candidate) => typeof candidate === "boolean",
    limit: isFiniteNumber,
    offset: isFiniteNumber,
    total_count: isNullableFiniteNumber,
  });

const parseArrayEnvelope = <T>(
  value: unknown,
  key: string,
  routeName: string,
  parseRow: (row: unknown, route: string) => T,
): T[] => {
  if (!isRecord(value) || !hasValidPaginationFields(value) || !Array.isArray(value[key])) {
    return invalidPublicCoreResponse(routeName);
  }
  return value[key].map((row) => parseRow(row, routeName));
};

const parseRecordEnvelope = <T>(
  value: unknown,
  key: string,
  routeName: string,
  parseRow: (row: unknown, route: string) => T,
): T => {
  if (!isRecord(value) || !isRecord(value[key])) return invalidPublicCoreResponse(routeName);
  return parseRow(value[key], routeName);
};

const parseCoreShowV2 = (value: unknown, routeName: string): CoreShowV2 => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !hasOptionalFields(value, {
      alternative_names: isStringArray,
      backdrop_url: isNullableString,
      canonical_slug: isNullableString,
      created_at: isNullableString,
      description: isNullableString,
      external_ids: isRecord,
      genres: isStringArray,
      imdb_id: isNullableString,
      imdb_rating_value: isNullableFiniteNumber,
      imdb_series_id: isNullableString,
      logo_url: isNullableString,
      most_recent_episode: isRecordOrStringOrNull,
      network: isNullableString,
      networks: isStringArray,
      poster_url: isNullableString,
      premiere_date: isNullableString,
      primary_backdrop_image_id: isNullableString,
      primary_logo_image_id: isNullableString,
      primary_poster_image_id: isNullableString,
      primary_tmdb_backdrop_path: isNullableString,
      primary_tmdb_logo_path: isNullableString,
      primary_tmdb_poster_path: isNullableString,
      show_total_episodes: isNullableFiniteNumber,
      show_total_seasons: isNullableFiniteNumber,
      slug: isNullableString,
      streaming: isNullableString,
      streaming_providers: isStringArray,
      tags: isStringArray,
      tmdb_id: isNullableFiniteNumber,
      tmdb_series_id: isNullableFiniteNumber,
      tmdb_status: isNullableString,
      tmdb_vote_average: isNullableFiniteNumber,
      updated_at: isNullableString,
    })
  ) {
    return invalidPublicCoreResponse(routeName);
  }
  return value as CoreShowV2;
};

const parseCoreSeasonV2 = (value: unknown, routeName: string): CoreSeasonV2 => {
  const episodeSignal = isRecord(value) ? value.episode_signal : undefined;
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.show_id !== "string" ||
    !isFiniteNumber(value.season_number) ||
    !hasOptionalFields(value, {
      air_date: isNullableString,
      created_at: isNullableString,
      external_ids: isRecord,
      external_tvdb_id: isNullableFiniteNumber,
      external_wikidata_id: isNullableString,
      fetched_at: isNullableString,
      imdb_series_id: isNullableString,
      language: isNullableString,
      name: isNullableString,
      overview: isNullableString,
      poster_path: isNullableString,
      premiere_date: isNullableString,
      show_name: isNullableString,
      title: isNullableString,
      tmdb_season_id: isNullableFiniteNumber,
      tmdb_season_object_id: isNullableString,
      tmdb_series_id: isNullableFiniteNumber,
      updated_at: isNullableString,
      url_original_poster: isNullableString,
    }) ||
    (episodeSignal !== undefined &&
      episodeSignal !== null &&
      (!isRecord(episodeSignal) ||
        !isFiniteNumber(episodeSignal.episode_count) ||
        !isNullableString(episodeSignal.first_air_date) ||
        typeof episodeSignal.has_episode_data !== "boolean" ||
        !isNullableString(episodeSignal.latest_air_date)))
  ) {
    return invalidPublicCoreResponse(routeName);
  }
  return value as CoreSeasonV2;
};

const parseCoreEpisodeV2 = (value: unknown, routeName: string): CoreEpisodeV2 => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !hasOptionalFields(value, {
      air_date: isNullableString,
      created_at: isNullableString,
      episode_number: isNullableFiniteNumber,
      episode_type: isNullableString,
      external_ids: isRecord,
      fetched_at: isNullableString,
      imdb_episode_id: isNullableString,
      imdb_primary_image_caption: isNullableString,
      imdb_primary_image_height: isNullableFiniteNumber,
      imdb_primary_image_url: isNullableString,
      imdb_primary_image_width: isNullableFiniteNumber,
      imdb_rating: isNullableFiniteNumber,
      imdb_vote_count: isNullableFiniteNumber,
      overview: isNullableString,
      production_code: isNullableString,
      runtime: isNullableFiniteNumber,
      season_id: isNullableString,
      season_number: isNullableFiniteNumber,
      show_id: isNullableString,
      show_name: isNullableString,
      show_slug: isNullableString,
      still_path: isNullableString,
      synopsis: isNullableString,
      title: isNullableString,
      tmdb_episode_id: isNullableFiniteNumber,
      tmdb_series_id: isNullableFiniteNumber,
      tmdb_vote_average: isNullableFiniteNumber,
      tmdb_vote_count: isNullableFiniteNumber,
      updated_at: isNullableString,
      url_original_still: isNullableString,
    })
  ) {
    return invalidPublicCoreResponse(routeName);
  }
  return value as CoreEpisodeV2;
};

const parseCoreCastMemberV2 = (value: unknown, routeName: string): CoreCastMemberV2 => {
  if (
    !isRecord(value) ||
    ["id", "show_id", "person_id", "credit_category", "source_type", "created_at", "updated_at"].some(
      (key) => typeof value[key] !== "string",
    ) ||
    !hasOptionalFields(value, {
      archive_episode_count: isNullableFiniteNumber,
      billing_order: isNullableFiniteNumber,
      cast_member_name: isNullableString,
      full_name: isNullableString,
      known_for: isNullableString,
      photo_url: isNullableString,
      role: isNullableString,
      show_name: isNullableString,
      thumbnail_crop_mode: isNullableCropMode,
      thumbnail_focus_x: isNullableFiniteNumber,
      thumbnail_focus_y: isNullableFiniteNumber,
      thumbnail_zoom: isNullableFiniteNumber,
      total_episodes: isNullableFiniteNumber,
    })
  ) {
    return invalidPublicCoreResponse(routeName);
  }
  return value as CoreCastMemberV2;
};

const parseCoreSeasonCastMemberV2 = (
  value: unknown,
  routeName: string,
): CoreSeasonCastMemberV2 => {
  if (
    !isRecord(value) ||
    typeof value.person_id !== "string" ||
    typeof value.person_name !== "string" ||
    !isNumberArray(value.seasons_appeared) ||
    !isFiniteNumber(value.total_episodes) ||
    !hasOptionalFields(value, {
      photo_url: isNullableString,
      thumbnail_crop_mode: isNullableCropMode,
      thumbnail_focus_x: isNullableFiniteNumber,
      thumbnail_focus_y: isNullableFiniteNumber,
      thumbnail_zoom: isNullableFiniteNumber,
    })
  ) {
    return invalidPublicCoreResponse(routeName);
  }
  return value as CoreSeasonCastMemberV2;
};

const parseCoreSeasonCastEpisodeCountV2 = (
  value: unknown,
  routeName: string,
): CoreSeasonCastEpisodeCountV2 => {
  if (
    !isRecord(value) ||
    typeof value.person_id !== "string" ||
    !isFiniteNumber(value.episodes_in_season) ||
    !hasOptionalFields(value, {
      archive_episodes_in_season: isNullableFiniteNumber,
      person_name: isNullableString,
      photo_url: isNullableString,
      thumbnail_crop_mode: isNullableCropMode,
      thumbnail_focus_x: isNullableFiniteNumber,
      thumbnail_focus_y: isNullableFiniteNumber,
      thumbnail_zoom: isNullableFiniteNumber,
      total_episodes: isNullableFiniteNumber,
    })
  ) {
    return invalidPublicCoreResponse(routeName);
  }
  return value as CoreSeasonCastEpisodeCountV2;
};

const parseCorePersonV2 = (value: unknown, routeName: string): AdminPersonReadV2 => {
  if (
    !isRecord(value) ||
    ["id", "full_name", "created_at", "updated_at"].some((key) => typeof value[key] !== "string") ||
    !hasOptionalFields(value, {
      alternative_names: (candidate) => candidate === null || isStringArrayRecord(candidate),
      biography: isNullableRecord,
      birthday: isNullableRecord,
      external_ids: isRecord,
      gender: isNullableRecord,
      homepage: isNullableRecord,
      known_for: isNullableString,
      place_of_birth: isNullableRecord,
      profile_image_url: isNullableRecord,
    })
  ) {
    return invalidPublicCoreResponse(routeName);
  }
  return value as AdminPersonReadV2;
};

const parseCorePersonCreditV2 = (value: unknown, routeName: string): CorePersonCreditV2 => {
  if (
    !isRecord(value) ||
    ["id", "person_id", "credit_category"].some((key) => typeof value[key] !== "string") ||
    !hasOptionalFields(value, {
      billing_order: isNullableFiniteNumber,
      external_imdb_id: isNullableString,
      external_url: isNullableString,
      metadata: isNullableRecord,
      role: isNullableString,
      show_id: isNullableString,
      show_name: isNullableString,
      source_type: isNullableString,
    })
  ) {
    return invalidPublicCoreResponse(routeName);
  }
  return value as CorePersonCreditV2;
};

const parseCorePersonEpisodeCreditV2 = (
  value: unknown,
  routeName: string,
): CorePersonEpisodeCreditV2 => {
  if (
    !isRecord(value) ||
    ["show_id", "credit_id", "credit_category", "episode_id"].some(
      (key) => typeof value[key] !== "string",
    ) ||
    !hasOptionalFields(value, {
      appearance_type: isNullableString,
      billing_order: isNullableFiniteNumber,
      episode_name: isNullableString,
      episode_number: isNullableFiniteNumber,
      role: isNullableString,
      season_number: isNullableFiniteNumber,
      source_type: isNullableString,
    })
  ) {
    return invalidPublicCoreResponse(routeName);
  }
  return value as CorePersonEpisodeCreditV2;
};

const parseSeasonAssetV2 = (value: unknown, routeName: string): SeasonAsset => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isNullableAssetType(value.type) ||
    typeof value.source !== "string" ||
    typeof value.kind !== "string" ||
    typeof value.hosted_url !== "string" ||
    !isNullableFiniteNumber(value.width) ||
    !isNullableFiniteNumber(value.height) ||
    !isNullableString(value.caption) ||
    !hasOptionalFields(value, {
      context_section: isNullableString,
      context_type: isNullableString,
      created_at: isNullableString,
      crop_detail_url: isNullableString,
      crop_display_url: isNullableString,
      detail_url: isNullableString,
      display_url: isNullableString,
      episode_number: isNullableFiniteNumber,
      fetched_at: isNullableString,
      hosted_content_type: isNullableString,
      ingest_status: isNullableString,
      link_id: isNullableString,
      logo_black_url: isNullableString,
      logo_link_is_primary: (candidate) => candidate === null || typeof candidate === "boolean",
      logo_white_url: isNullableString,
      media_asset_id: isNullableString,
      metadata: isNullableRecord,
      origin_table: isNullableAssetOrigin,
      original_url: isNullableString,
      people_count: isNullableFiniteNumber,
      people_count_source: (candidate) =>
        candidate === null || candidate === "auto" || candidate === "manual",
      person_id: isNullableString,
      person_name: isNullableString,
      season_number: isNullableFiniteNumber,
      source_url: isNullableString,
      thumb_url: isNullableString,
      thumbnail_crop_mode: isNullableCropMode,
      thumbnail_focus_x: isNullableFiniteNumber,
      thumbnail_focus_y: isNullableFiniteNumber,
      thumbnail_zoom: isNullableFiniteNumber,
    })
  ) {
    return invalidPublicCoreResponse(routeName);
  }
  return value as unknown as SeasonAsset;
};

const mapCoreShowV2ToTrrShow = (show: CoreShowV2): TrrShow =>
  normalizeTrrShowRow({
    id: show.id,
    name: show.name,
    slug: show.slug ?? "",
    canonical_slug: show.canonical_slug ?? show.slug ?? "",
    alternative_names: show.alternative_names ?? [],
    overview_alternative_names: null,
    imdb_id: show.imdb_id ?? show.imdb_series_id ?? null,
    tmdb_id: show.tmdb_id ?? show.tmdb_series_id ?? null,
    external_ids: show.external_ids ?? null,
    derived_external_links: null,
    overview_watch_availability: null,
    watch_provider_regions: null,
    show_total_seasons: show.show_total_seasons ?? null,
    show_total_episodes: show.show_total_episodes ?? null,
    description: show.description ?? null,
    premiere_date: show.premiere_date ?? null,
    genres: show.genres ?? [],
    networks: show.networks ?? [],
    overview_networks: null,
    streaming_providers: show.streaming_providers ?? [],
    overview_streaming_providers: null,
    watch_providers: [],
    tags: show.tags ?? [],
    primary_poster_image_id: show.primary_poster_image_id ?? null,
    primary_backdrop_image_id: show.primary_backdrop_image_id ?? null,
    primary_logo_image_id: show.primary_logo_image_id ?? null,
    poster_url: show.poster_url ?? null,
    backdrop_url: show.backdrop_url ?? null,
    logo_url: show.logo_url ?? null,
    tmdb_status: show.tmdb_status ?? null,
    tmdb_vote_average: show.tmdb_vote_average ?? null,
    imdb_rating_value: show.imdb_rating_value ?? null,
    created_at: show.created_at ?? "",
    updated_at: show.updated_at ?? "",
  });

const mapCoreSeasonV2ToTrrSeason = (season: CoreSeasonV2): TrrSeason => ({
  id: season.id,
  show_id: season.show_id,
  show_name: season.show_name ?? null,
  season_number: season.season_number,
  name: season.name ?? null,
  title: season.title ?? null,
  overview: season.overview ?? null,
  air_date: season.air_date ?? null,
  premiere_date: season.premiere_date ?? null,
  poster_path: season.poster_path ?? null,
  url_original_poster: season.url_original_poster ?? null,
  tmdb_season_id: season.tmdb_season_id ?? null,
  has_scheduled_or_aired_episode: season.episode_signal?.has_episode_data,
  episode_airdate_count: season.episode_signal?.episode_count,
  fandom_source_url: null,
  fandom_page_title: null,
  created_at: season.created_at ?? "",
  updated_at: season.updated_at ?? "",
});

const mapCoreEpisodeV2ToTrrEpisode = (episode: CoreEpisodeV2): TrrEpisode => ({
  id: episode.id,
  show_id: episode.show_id ?? "",
  season_id: episode.season_id ?? "",
  show_name: episode.show_name ?? null,
  season_number: episode.season_number ?? 0,
  episode_number: episode.episode_number ?? 0,
  title: episode.title ?? null,
  synopsis: episode.synopsis ?? null,
  overview: episode.overview ?? null,
  air_date: episode.air_date ?? null,
  runtime: episode.runtime ?? null,
  still_path: episode.still_path ?? null,
  url_original_still: episode.url_original_still ?? null,
  imdb_primary_image_url: episode.imdb_primary_image_url ?? null,
  imdb_rating: episode.imdb_rating ?? null,
  imdb_vote_count: episode.imdb_vote_count ?? null,
  tmdb_vote_average: episode.tmdb_vote_average ?? null,
  tmdb_vote_count: episode.tmdb_vote_count ?? null,
  imdb_episode_id: episode.imdb_episode_id ?? null,
  tmdb_episode_id: episode.tmdb_episode_id ?? null,
  created_at: episode.created_at ?? "",
  updated_at: episode.updated_at ?? "",
});

const mapCoreEpisodeV2ToSearchEntry = (episode: CoreEpisodeV2): EpisodeSearchEntry => ({
  id: episode.id,
  title: episode.title ?? null,
  episode_number: episode.episode_number ?? null,
  season_number: episode.season_number ?? null,
  air_date: episode.air_date ?? null,
  show_id: episode.show_id ?? "",
  show_name: episode.show_name ?? null,
  show_slug: episode.show_slug ?? "",
});

const mapCoreCastMemberV2 = (cast: CoreCastMemberV2): TrrCastMember => ({
  id: cast.id,
  show_id: cast.show_id,
  person_id: cast.person_id,
  show_name: cast.show_name ?? null,
  cast_member_name: cast.cast_member_name ?? null,
  role: cast.role ?? null,
  billing_order: cast.billing_order ?? null,
  credit_category: cast.credit_category,
  source_type: cast.source_type,
  full_name: cast.full_name ?? cast.cast_member_name ?? null,
  known_for: cast.known_for ?? null,
  photo_url: cast.photo_url ?? null,
  thumbnail_focus_x: cast.thumbnail_focus_x ?? null,
  thumbnail_focus_y: cast.thumbnail_focus_y ?? null,
  thumbnail_zoom: cast.thumbnail_zoom ?? null,
  thumbnail_crop_mode: cast.thumbnail_crop_mode ?? null,
  total_episodes: cast.total_episodes ?? null,
  archive_episode_count: cast.archive_episode_count ?? null,
  created_at: cast.created_at,
  updated_at: cast.updated_at,
});

const mapCoreSeasonCastMemberV2 = (cast: CoreSeasonCastMemberV2): SeasonCastMember => ({
  person_id: cast.person_id,
  person_name: cast.person_name,
  seasons_appeared: cast.seasons_appeared,
  total_episodes: cast.total_episodes,
  photo_url: cast.photo_url ?? null,
  thumbnail_focus_x: cast.thumbnail_focus_x ?? null,
  thumbnail_focus_y: cast.thumbnail_focus_y ?? null,
  thumbnail_zoom: cast.thumbnail_zoom ?? null,
  thumbnail_crop_mode: cast.thumbnail_crop_mode ?? null,
});

const mapCoreSeasonCastEpisodeCountV2 = (
  cast: CoreSeasonCastEpisodeCountV2,
): SeasonCastEpisodeCount => ({
  person_id: cast.person_id,
  person_name: cast.person_name ?? null,
  episodes_in_season: cast.episodes_in_season,
  total_episodes: cast.total_episodes ?? null,
  photo_url: cast.photo_url ?? null,
  thumbnail_focus_x: cast.thumbnail_focus_x ?? null,
  thumbnail_focus_y: cast.thumbnail_focus_y ?? null,
  thumbnail_zoom: cast.thumbnail_zoom ?? null,
  thumbnail_crop_mode: cast.thumbnail_crop_mode ?? null,
  archive_episodes_in_season: cast.archive_episodes_in_season ?? null,
});

const mapCorePersonCreditV2 = (credit: CorePersonCreditV2): TrrPersonCredit => ({
  id: credit.id,
  show_id: credit.show_id ?? null,
  person_id: credit.person_id,
  show_name: credit.show_name ?? null,
  role: credit.role ?? null,
  billing_order: credit.billing_order ?? null,
  credit_category: credit.credit_category,
  source_type: credit.source_type ?? null,
  external_imdb_id: credit.external_imdb_id ?? null,
  external_url: credit.external_url ?? null,
  metadata: credit.metadata ?? null,
});

const mapCorePersonEpisodeCreditV2 = (
  credit: CorePersonEpisodeCreditV2,
): PersonEpisodeCredit => ({
  show_id: credit.show_id,
  credit_id: credit.credit_id,
  credit_category: credit.credit_category,
  role: credit.role ?? null,
  billing_order: credit.billing_order ?? null,
  source_type: credit.source_type ?? null,
  episode_id: credit.episode_id,
  season_number: credit.season_number ?? null,
  episode_number: credit.episode_number ?? null,
  episode_name: credit.episode_name ?? null,
  appearance_type: credit.appearance_type ?? null,
});

const mapCorePersonShowEpisodeCreditV2 = (
  credit: CorePersonEpisodeCreditV2 | PersonEpisodeCredit,
): PersonShowEpisodeCredit => ({
  credit_id: credit.credit_id,
  credit_category: credit.credit_category,
  role: credit.role ?? null,
  billing_order: credit.billing_order ?? null,
  source_type: credit.source_type ?? null,
  episode_id: credit.episode_id,
  season_number: credit.season_number ?? null,
  episode_number: credit.episode_number ?? null,
  episode_name: credit.episode_name ?? null,
  appearance_type: credit.appearance_type ?? null,
});

const mapCorePersonV2ToTrrPerson = (
  person: AdminPersonReadV2,
): TrrPerson => ({
  id: String(person.id ?? ""),
  full_name: String(person.full_name ?? ""),
  known_for: typeof person.known_for === "string" ? person.known_for : null,
  external_ids: isRecord(person.external_ids) ? person.external_ids : {},
  birthday: isRecord(person.birthday) ? person.birthday : null,
  gender: isRecord(person.gender) ? person.gender : null,
  biography: isRecord(person.biography) ? person.biography : null,
  place_of_birth: isRecord(person.place_of_birth) ? person.place_of_birth : null,
  homepage: isRecord(person.homepage) ? person.homepage : null,
  profile_image_url: isRecord(person.profile_image_url) ? person.profile_image_url : null,
  alternative_names: isRecord(person.alternative_names)
    ? (person.alternative_names as Record<string, string[]>)
    : null,
  created_at: typeof person.created_at === "string" ? person.created_at : "",
  updated_at: typeof person.updated_at === "string" ? person.updated_at : "",
});

const CANONICAL_PROFILE_SOURCES = ["imdb", "tmdb", "fandom", "manual"] as const;
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
  dynamic_sections?: unknown[] | null;
  bio_card?: Record<string, unknown> | null;
  casting_summary?: string | null;
  citations?: unknown[] | null;
  conflicts?: unknown[] | null;
  source_variants?: Record<string, unknown> | null;
  ai_model?: string | null;
  ai_generated_at?: string | null;
}

export interface TrrSeasonFandom {
  id: string;
  season_id: string;
  show_id: string;
  season_number: number;
  source: string;
  source_url: string;
  page_title: string | null;
  page_revision_id: number | null;
  scraped_at: string;
  summary: string | null;
  dynamic_sections?: unknown[] | null;
  citations?: unknown[] | null;
  conflicts?: unknown[] | null;
  source_variants?: unknown;
  ai_model?: string | null;
  ai_generated_at?: string | null;
  raw_html_sha256?: string | null;
}

// ============================================================================
// Pagination
// ============================================================================

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface SeasonListOptions extends PaginationOptions {
  includeEpisodeSignal?: boolean;
}

export interface SourcePaginationOptions extends PaginationOptions {
  sources?: string[];
  includeBroken?: boolean;
  full?: boolean;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 500;
const SHOW_SLUG_SQL = `
  lower(
    trim(
      both '-' FROM regexp_replace(
        regexp_replace(COALESCE(s.name, ''), '&', ' and ', 'gi'),
        '[^a-z0-9]+',
        '-',
        'gi'
      )
    )
  )
`;

function normalizePagination(options?: PaginationOptions): {
  limit: number;
  offset: number;
} {
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(options?.offset ?? 0, 0);
  return { limit, offset };
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
  const routeName = "public-core-shows-list";
  const upstream = await fetchPublicCoreJson("/shows", {
    routeName,
    queryString: buildPaginationQueryString({ q: query || undefined, limit, offset }),
  });

  if (upstream.status === 200) {
    return parseArrayEnvelope(upstream.data, "shows", routeName, parseCoreShowV2).map(
      mapCoreShowV2ToTrrShow,
    );
  }
  if (upstream.status === 404) return [];
  return throwPublicCoreStatusError(upstream, routeName, "Failed to search public core shows");
}

/**
 * Get a single show by ID.
 * Fetches image URLs from show_images table based on primary_*_image_id fields.
 */
export async function getShowById(id: string): Promise<TrrShow | null> {
  const routeName = "public-core-show-detail";
  const upstream = await fetchPublicCoreJson(`/shows/${encodeURIComponent(id)}`, {
    routeName,
  });

  if (upstream.status === 200) {
    return mapCoreShowV2ToTrrShow(
      parseRecordEnvelope(upstream.data, "show", routeName, parseCoreShowV2),
    );
  }
  if (upstream.status === 404) return null;
  return throwPublicCoreStatusError(upstream, routeName, "Failed to load the public core show");
}

/**
 * Validate that a show image belongs to the given show and matches expected featured kind.
 */
export async function validateShowImageForField(
  showId: string,
  imageId: string,
  expectedKind: ShowFeaturedImageKind,
  options: { adminContext: VerifiedAdminContext },
): Promise<boolean> {
  const routeName = "admin-show-featured-image-validation";
  const upstream = await fetchAdminBackendJson(
    `/admin/shows/${encodeURIComponent(showId)}/featured-image-validation`,
    {
      adminContext: options.adminContext,
      apiVersion: "v2",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_id: imageId, expected_kind: expectedKind }),
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName,
      requestRole: "primary",
    },
  );
  if (upstream.status !== 200) {
    throw buildAdminBackendStatusError({
      status: upstream.status,
      data: upstream.data,
      fallbackMessage: "Failed to validate featured show image.",
      routeName,
      requestRole: "primary",
    });
  }
  if (typeof upstream.data.valid !== "boolean") {
    throw new AdminReadProxyError("Invalid featured-image validation response from backend", 502, {
      code: "INVALID_BACKEND_RESPONSE",
      retryable: true,
      detail: { route: routeName },
    });
  }
  return upstream.data.valid;
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
  if (input.slug !== undefined) {
    updates.push(`slug = $${paramIndex++}::text`);
    values.push(input.slug);
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
  if (input.imdbId !== undefined) {
    updates.push(`imdb_id = $${paramIndex++}::text`);
    values.push(input.imdbId);
  }
  if (input.tmdbId !== undefined) {
    updates.push(`tmdb_id = $${paramIndex++}::int`);
    values.push(input.tmdbId);
  }
  if (input.externalIds !== undefined) {
    updates.push(`external_ids = $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(input.externalIds ?? {}));
  }
  if (input.genres !== undefined) {
    updates.push(`genres = $${paramIndex++}::text[]`);
    values.push(input.genres);
  }
  if (input.networks !== undefined) {
    updates.push(`networks = $${paramIndex++}::text[]`);
    values.push(input.networks);
  }
  if (input.streamingProviders !== undefined) {
    updates.push(`streaming_providers = $${paramIndex++}::text[]`);
    values.push(input.streamingProviders);
  }
  if (input.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}::text[]`);
    values.push(input.tags);
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
    `WITH updated_show AS (
       UPDATE core.shows AS updated
       SET ${updates.join(", ")}
       WHERE updated.id = $${paramIndex}::uuid
       RETURNING updated.id
     ),
     shows_with_slug AS (
       SELECT
         s.*,
         ${SHOW_SLUG_SQL} AS computed_slug,
         COUNT(*) OVER (PARTITION BY ${SHOW_SLUG_SQL}) AS slug_collision_count
       FROM core.shows AS s
     )
     SELECT
       s.*,
       CASE
         WHEN s.slug_collision_count > 1
           THEN COALESCE(NULLIF(s.slug, ''), s.computed_slug) || '--' || lower(left(s.id::text, 8))
         ELSE COALESCE(NULLIF(s.slug, ''), s.computed_slug)
       END AS canonical_slug,
       poster.hosted_url AS poster_url,
       backdrop.hosted_url AS backdrop_url,
       logo.hosted_url AS logo_url
     FROM shows_with_slug AS s
     JOIN updated_show AS updated ON updated.id = s.id
     LEFT JOIN core.show_images AS poster ON poster.id = s.primary_poster_image_id
     LEFT JOIN core.show_images AS backdrop ON backdrop.id = s.primary_backdrop_image_id
     LEFT JOIN core.show_images AS logo ON logo.id = s.primary_logo_image_id
     LIMIT 1`,
    values
  );
  const row = result.rows[0] ?? null;
  return row ? normalizeTrrShowRow(row) : null;
}

// ============================================================================
// Season Functions
// ============================================================================

/**
 * Get all seasons for a show, ordered by season_number DESC (newest first).
 */
export async function getSeasonsByShowId(
  showId: string,
  options?: SeasonListOptions
): Promise<TrrSeason[]> {
  const { limit, offset } = normalizePagination(options);
  const routeName = "public-core-show-seasons-list";
  const upstream = await fetchPublicCoreJson(`/shows/${encodeURIComponent(showId)}/seasons`, {
    routeName,
    queryString: buildPaginationQueryString({
      include_episode_signal: options?.includeEpisodeSignal === true,
      limit,
      offset,
    }),
  });

  if (upstream.status === 200) {
    return parseArrayEnvelope(upstream.data, "seasons", routeName, parseCoreSeasonV2).map(
      mapCoreSeasonV2ToTrrSeason,
    );
  }
  if (upstream.status === 404) return [];
  return throwPublicCoreStatusError(upstream, routeName, "Failed to load public core show seasons");
}

/**
 * Get a single season by ID.
 */
export async function getSeasonById(seasonId: string): Promise<TrrSeason | null> {
  const routeName = "public-core-season-detail";
  const upstream = await fetchPublicCoreJson(`/seasons/${encodeURIComponent(seasonId)}`, {
    routeName,
  });

  if (upstream.status === 200) {
    return mapCoreSeasonV2ToTrrSeason(
      parseRecordEnvelope(upstream.data, "season", routeName, parseCoreSeasonV2),
    );
  }
  if (upstream.status === 404) return null;
  return throwPublicCoreStatusError(upstream, routeName, "Failed to load the public core season");
}

/**
 * Get a season by show ID and season number.
 */
export async function getSeasonByShowAndNumber(
  showId: string,
  seasonNumber: number
): Promise<TrrSeason | null> {
  const routeName = "public-core-show-season-detail";
  const upstream = await fetchPublicCoreJson(
    `/shows/${encodeURIComponent(showId)}/seasons/${encodeURIComponent(String(seasonNumber))}`,
    { routeName },
  );

  if (upstream.status === 200) {
    return mapCoreSeasonV2ToTrrSeason(
      parseRecordEnvelope(upstream.data, "season", routeName, parseCoreSeasonV2),
    );
  }
  if (upstream.status === 404) return null;
  return throwPublicCoreStatusError(upstream, routeName, "Failed to load the public core show season");
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
  const routeName = "public-core-season-episodes-list";
  const upstream = await fetchPublicCoreJson(`/seasons/${encodeURIComponent(seasonId)}/episodes`, {
    routeName,
    queryString: buildPaginationQueryString({ limit, offset }),
  });

  if (upstream.status === 200) {
    return parseArrayEnvelope(upstream.data, "episodes", routeName, parseCoreEpisodeV2).map(
      mapCoreEpisodeV2ToTrrEpisode,
    );
  }
  if (upstream.status === 404) return [];
  return throwPublicCoreStatusError(upstream, routeName, "Failed to load public core season episodes");
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
  const routeName = "public-core-show-season-episodes-list";
  const upstream = await fetchPublicCoreJson(
    `/shows/${encodeURIComponent(showId)}/seasons/${encodeURIComponent(String(seasonNumber))}/episodes`,
    {
      routeName,
      queryString: buildPaginationQueryString({ limit, offset }),
    },
  );

  if (upstream.status === 200) {
    return parseArrayEnvelope(upstream.data, "episodes", routeName, parseCoreEpisodeV2).map(
      mapCoreEpisodeV2ToTrrEpisode,
    );
  }
  if (upstream.status === 404) return [];
  return throwPublicCoreStatusError(upstream, routeName, "Failed to load public core show season episodes");
}

/**
 * Get a single episode by ID.
 */
export async function getEpisodeById(episodeId: string): Promise<TrrEpisode | null> {
  const routeName = "public-core-episode-detail";
  const upstream = await fetchPublicCoreJson(`/episodes/${encodeURIComponent(episodeId)}`, {
    routeName,
  });

  if (upstream.status === 200) {
    return mapCoreEpisodeV2ToTrrEpisode(
      parseRecordEnvelope(upstream.data, "episode", routeName, parseCoreEpisodeV2),
    );
  }
  if (upstream.status === 404) return null;
  return throwPublicCoreStatusError(upstream, routeName, "Failed to load the public core episode");
}

// ============================================================================
// Cast Functions
// ============================================================================

export type CastPhotoFallbackMode = "none" | "bravo";

export interface CastPhotoLookupDiagnostics {
  media_links_query_ms: number;
  cast_photos_query_ms: number;
  link_featured_images_query_ms: number;
  people_query_ms: number;
  bravo_links_query_ms: number;
  bravo_profile_fetch_ms: number;
  bravo_profiles_attempted: number;
  bravo_profiles_resolved: number;
}

export interface CastQueryOptions extends PaginationOptions {
  photoFallbackMode?: CastPhotoFallbackMode;
  photoLookupDiagnostics?: CastPhotoLookupDiagnostics;
}

const DEFAULT_CAST_PHOTO_FALLBACK_MODE: CastPhotoFallbackMode = "none";

/**
 * Get cast members for a show, ordered by billing_order ASC.
 * Joins with people table to get full_name and with cast_photos for photo URL.
 */
export async function getCastByShowId(
  showId: string,
  options?: CastQueryOptions
): Promise<TrrCastMember[]> {
  const { limit, offset } = normalizePagination(options);
  const routeName = "public-core-show-cast-membership";
  const upstream = await fetchPublicCoreJson(`/shows/${encodeURIComponent(showId)}/cast`, {
    routeName,
    queryString: buildPaginationQueryString({
      view: "membership",
      include_photos: true,
      photo_fallback: options?.photoFallbackMode ?? DEFAULT_CAST_PHOTO_FALLBACK_MODE,
      limit,
      offset,
    }),
  });
  if (upstream.status === 200) {
    return parseArrayEnvelope(upstream.data, "cast", routeName, parseCoreCastMemberV2).map(
      mapCoreCastMemberV2,
    );
  }
  if (upstream.status === 404) return [];
  return throwPublicCoreStatusError(upstream, routeName, "Failed to load public core show cast");
}

/**
 * Lightweight cast-name helper for routes that only need text context.
 * Avoids photo/metadata fanout used by getCastByShowId().
 */
export async function getCastNamesByShowId(
  showId: string,
  options?: { limit?: number },
): Promise<string[]> {
  const limit = Math.min(Math.max(options?.limit ?? 60, 1), MAX_LIMIT);
  const routeName = "public-core-show-cast-names";
  const upstream = await fetchPublicCoreJson(`/shows/${encodeURIComponent(showId)}/cast`, {
    routeName,
    queryString: buildPaginationQueryString({
      view: "membership",
      include_photos: false,
      photo_fallback: "none",
      limit,
      offset: 0,
    }),
  });
  if (upstream.status === 404) return [];
  if (upstream.status !== 200) {
    return throwPublicCoreStatusError(
      upstream,
      routeName,
      "Failed to load public core show cast names",
    );
  }

  const deduped = new Map<string, string>();
  for (const row of parseArrayEnvelope(
    upstream.data,
    "cast",
    routeName,
    parseCoreCastMemberV2,
  )) {
    const raw =
      typeof row.full_name === "string"
        ? row.full_name
        : typeof row.cast_member_name === "string"
          ? row.cast_member_name
          : "";
    const normalized = raw.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (deduped.has(key)) continue;
    deduped.set(key, normalized);
  }
  return [...deduped.values()];
}

/**
 * Get cast members for a show with total episode counts and any available photo URL.
 * Uses v_person_show_seasons for totals and v_cast_photos for display_url (fallback to hosted/url).
 */
export async function getShowCastWithStats(
  showId: string,
  options?: CastQueryOptions
): Promise<TrrCastMember[]> {
  const { limit, offset } = normalizePagination(options);
  const routeName = "public-core-show-cast-episode-evidence";
  const upstream = await fetchPublicCoreJson(`/shows/${encodeURIComponent(showId)}/cast`, {
    routeName,
    queryString: buildPaginationQueryString({
      view: "episode_evidence",
      include_photos: true,
      photo_fallback: options?.photoFallbackMode ?? DEFAULT_CAST_PHOTO_FALLBACK_MODE,
      limit,
      offset,
    }),
  });
  if (upstream.status === 200) {
    return parseArrayEnvelope(upstream.data, "cast", routeName, parseCoreCastMemberV2).map(
      mapCoreCastMemberV2,
    );
  }
  if (upstream.status === 404) return [];
  return throwPublicCoreStatusError(
    upstream,
    routeName,
    "Failed to load public core show cast with episode evidence",
  );
}

/**
 * Get show cast members that only have archive-footage episode evidence.
 */
export async function getShowArchiveFootageCast(
  showId: string,
  options?: CastQueryOptions
): Promise<TrrCastMember[]> {
  const { limit, offset } = normalizePagination(options);
  const routeName = "public-core-show-cast-archive-only";
  const upstream = await fetchPublicCoreJson(`/shows/${encodeURIComponent(showId)}/cast`, {
    routeName,
    queryString: buildPaginationQueryString({
      view: "archive_only",
      include_photos: true,
      photo_fallback: options?.photoFallbackMode ?? DEFAULT_CAST_PHOTO_FALLBACK_MODE,
      limit,
      offset,
    }),
  });
  if (upstream.status === 200) {
    return parseArrayEnvelope(upstream.data, "cast", routeName, parseCoreCastMemberV2).map(
      mapCoreCastMemberV2,
    );
  }
  if (upstream.status === 404) return [];
  return throwPublicCoreStatusError(
    upstream,
    routeName,
    "Failed to load public core archive-footage cast",
  );
}

/**
 * Get a single person by ID.
 */
export async function getPersonById(
  personId: string,
  options?: { adminContext?: VerifiedAdminContext },
): Promise<TrrPerson | null> {
  const routeName = "admin-core-person-detail";
  const upstream = await fetchAdminBackendJson(
    `/admin/people/${encodeURIComponent(personId)}`,
    {
      adminContext: options?.adminContext,
      apiVersion: "v2",
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName,
      requestRole: "secondary",
    },
  );
  if (upstream.status === 200) {
    return mapCorePersonV2ToTrrPerson(
      parseRecordEnvelope(upstream.data, "person", routeName, parseCorePersonV2),
    );
  }
  if (upstream.status === 404) return null;
  throw buildAdminBackendStatusError({
    status: upstream.status,
    data: upstream.data,
    fallbackMessage: "Failed to load person.",
    routeName,
    requestRole: "secondary",
  });
}

type EffectivePersonSocialHandleRow = {
  person_id: string;
  external_ids: Record<string, unknown> | null;
  instagram_override: string | null;
  tiktok_override: string | null;
  twitter_override: string | null;
  youtube_override: string | null;
};

const pickFirstNonEmptyString = (...candidates: unknown[]): string | null => {
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed) return trimmed;
  }
  return null;
};

const readSocialHandleFromExternalIds = (
  externalIds: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): string | null => {
  if (!externalIds) return null;
  for (const key of keys) {
    const value = externalIds[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
};

const normalizeOptionalSocialHandle = (
  source: Extract<
    PersonExternalIdSource,
    "facebook" | "instagram" | "twitter" | "tiktok" | "youtube"
  >,
  value: string | null,
): string | null => {
  if (!value) return null;
  const normalized = normalizePersonExternalIdValue(source, value);
  return normalized.trim() ? normalized : null;
};

export async function listEffectivePersonSocialHandlesByPersonIds(
  personIds: readonly string[],
): Promise<Map<string, PersonEffectiveSocialHandles>> {
  const uniquePersonIds = [...new Set(personIds.map((personId) => personId.trim()).filter(Boolean))];
  if (uniquePersonIds.length === 0) return new Map();

  const result = await pgQuery<EffectivePersonSocialHandleRow>(
    `SELECT
       p.id::text AS person_id,
       p.external_ids,
       po.instagram_handle AS instagram_override,
       po.tiktok_handle AS tiktok_override,
       po.twitter_handle AS twitter_override,
       po.youtube_handle AS youtube_override
     FROM core.people AS p
     LEFT JOIN core.people_overrides AS po
       ON po.person_id = p.id
     WHERE p.id = ANY($1::uuid[])`,
    [uniquePersonIds],
  );

  const handlesByPersonId = new Map<string, PersonEffectiveSocialHandles>();
  for (const personId of uniquePersonIds) {
    handlesByPersonId.set(personId, {
      person_id: personId,
      facebook_handle: null,
      instagram_handle: null,
      tiktok_handle: null,
      twitter_handle: null,
      youtube_handle: null,
    });
  }

  for (const row of result.rows) {
    const externalIds =
      row.external_ids && typeof row.external_ids === "object"
        ? (row.external_ids as Record<string, unknown>)
        : null;

    handlesByPersonId.set(row.person_id, {
      person_id: row.person_id,
      facebook_handle: normalizeOptionalSocialHandle(
        "facebook",
        readSocialHandleFromExternalIds(externalIds, [
          "facebook_id",
          "facebook",
          "facebook_handle",
        ]),
      ),
      instagram_handle: normalizeOptionalSocialHandle(
        "instagram",
        pickFirstNonEmptyString(
          row.instagram_override,
          readSocialHandleFromExternalIds(externalIds, [
            "instagram_id",
            "instagram",
            "instagram_handle",
          ]),
        ),
      ),
      tiktok_handle: normalizeOptionalSocialHandle(
        "tiktok",
        pickFirstNonEmptyString(
          row.tiktok_override,
          readSocialHandleFromExternalIds(externalIds, [
            "tiktok_id",
            "tiktok",
            "tiktok_handle",
          ]),
        ),
      ),
      twitter_handle: normalizeOptionalSocialHandle(
        "twitter",
        pickFirstNonEmptyString(
          row.twitter_override,
          readSocialHandleFromExternalIds(externalIds, [
            "twitter_id",
            "twitter",
            "twitter_handle",
            "x_id",
            "x_handle",
            "x",
          ]),
        ),
      ),
      youtube_handle: normalizeOptionalSocialHandle(
        "youtube",
        pickFirstNonEmptyString(
          row.youtube_override,
          readSocialHandleFromExternalIds(externalIds, [
            "youtube_id",
            "youtube",
            "youtube_handle",
          ]),
        ),
      ),
    });
  }

  return handlesByPersonId;
}

const mapPrimaryPersonExternalIdRows = (
  rows: Array<Record<string, unknown>>,
): PersonExternalIdRecord[] =>
  rows.reduce<PersonExternalIdRecord[]>((records, row) => {
      const sourceId = typeof row.source_id === "string" ? row.source_id : "";
      if (!isPersonExternalIdSource(sourceId)) return records;
      const externalId = typeof row.external_id === "string" ? row.external_id.trim() : "";
      if (!externalId) return records;
      records.push({
        id:
          typeof row.id === "number"
            ? row.id
            : typeof row.id === "string"
              ? Number.parseInt(row.id, 10)
              : null,
        source_id: sourceId,
        external_id: externalId,
        is_primary: row.is_primary !== false,
        valid_from: typeof row.valid_from === "string" ? row.valid_from : null,
        valid_to: typeof row.valid_to === "string" ? row.valid_to : null,
        observed_at: typeof row.observed_at === "string" ? row.observed_at : null,
        created_at: typeof row.created_at === "string" ? row.created_at : null,
        updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
      } satisfies PersonExternalIdRecord);
      return records;
    }, []);

export async function syncPersonExternalIds(
  personId: string,
  inputs: PersonExternalIdInput[],
  options?: { adminContext?: VerifiedAdminContext },
): Promise<PersonExternalIdRecord[]> {
  const upstream = await fetchAdminBackendJson(`/admin/people/${personId}/external-ids`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ external_ids: inputs }),
    adminContext: options?.adminContext,
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName: "person-external-ids:sync",
    requestRole: "primary",
  });
  if (upstream.status !== 200) {
    throw buildAdminBackendStatusError({
      status: upstream.status,
      data: upstream.data,
      fallbackMessage: "Failed to update person external IDs.",
      routeName: "person-external-ids:sync",
      requestRole: "primary",
    });
  }

  const rawRows = Array.isArray(upstream.data.external_ids) ? upstream.data.external_ids : [];
  return mapPrimaryPersonExternalIdRows(
    rawRows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object"),
  );
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
  options?: PaginationOptions & { adminContext?: VerifiedAdminContext },
): Promise<TrrPerson[]> {
  const { limit, offset } = normalizePagination(options);
  const routeName = "admin-core-people-search";
  const upstream = await fetchAdminBackendJson("/admin/people", {
    adminContext: options?.adminContext,
    apiVersion: "v2",
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName,
    requestRole: "secondary",
    queryString: buildPaginationQueryString({ q: query, limit, offset }),
  });
  if (upstream.status === 200) {
    return parseArrayEnvelope(upstream.data, "people", routeName, parseCorePersonV2).map(
      mapCorePersonV2ToTrrPerson,
    );
  }
  if (upstream.status === 404) return [];
  throw buildAdminBackendStatusError({
    status: upstream.status,
    data: upstream.data,
    fallbackMessage: "Failed to search people.",
    routeName,
    requestRole: "secondary",
  });
}

// ============================================================================
// Person Photo & Credit Functions
// ============================================================================

export interface TrrPersonPhoto {
  id: string;
  person_id: string;
  source: string;
  source_image_id?: string | null;
  source_asset_id?: string | null;
  url: string | null;
  hosted_url: string | null;
  original_url?: string | null;
  thumb_url?: string | null;
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
  bucket_type?: "show" | "wwhl" | "bravocon" | "event" | "unknown" | null;
  bucket_key?: string | null;
  bucket_label?: string | null;
  resolved_show_id?: string | null;
  resolved_show_name?: string | null;
  getty_event_group_title?: string | null;
  season: number | null;
  source_page_url?: string | null;
  // Metadata fields
  people_names: string[] | null;
  people_ids: string[] | null;
  people_count?: number | null;
  people_count_source?: "auto" | "manual" | null;
  face_boxes?: FaceBoxTag[] | null;
  face_crops?: FaceCropTag[] | null;
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

export interface FaceBoxTag {
  index: number;
  kind: "face";
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number | null;
  person_id?: string;
  person_name?: string;
  label?: string;
  match_similarity?: number | null;
  match_status?: string | null;
  match_reason?: string | null;
  match_candidates?: Array<{
    person_id?: string | null;
    person_name?: string | null;
    similarity: number;
  }> | null;
  label_source?: string | null;
}

export interface FaceCropTag {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  variant_key?: string;
  variant_url?: string;
  size?: number;
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
  metadata?: Record<string, unknown> | null;
}

export interface PersonShowEpisodeCredit {
  credit_id: string;
  credit_category: string;
  role: string | null;
  billing_order: number | null;
  source_type: string | null;
  episode_id: string;
  season_number: number | null;
  episode_number: number | null;
  episode_name: string | null;
  appearance_type: string | null;
}

export interface PersonEpisodeCredit extends PersonShowEpisodeCredit {
  show_id: string;
}

export async function getCreditsByPersonId(
  personId: string,
  options?: PaginationOptions
): Promise<TrrPersonCredit[]> {
  const { limit, offset } = normalizePagination(options);
  const routeName = "public-core-person-credits";
  const upstream = await fetchPublicCoreJson(`/people/${encodeURIComponent(personId)}/credits`, {
    routeName,
    queryString: buildPaginationQueryString({ limit, offset }),
  });
  if (upstream.status === 200) {
    return parseArrayEnvelope(upstream.data, "credits", routeName, parseCorePersonCreditV2).map(
      mapCorePersonCreditV2,
    );
  }
  if (upstream.status === 404) return [];
  return throwPublicCoreStatusError(upstream, routeName, "Failed to load public core person credits");
}

export async function getCuratedCastShowIdsByPersonId(personId: string): Promise<Set<string>> {
  const routeName = "public-core-person-curated-cast-shows";
  const upstream = await fetchPublicCoreJson(`/people/${encodeURIComponent(personId)}/credits`, {
    routeName,
    queryString: buildPaginationQueryString({ limit: MAX_LIMIT, offset: 0 }),
  });
  if (upstream.status === 200) {
    parseArrayEnvelope(upstream.data, "credits", routeName, parseCorePersonCreditV2);
    if (!Array.isArray(upstream.data.curated_cast_show_ids)) {
      return invalidPublicCoreResponse(routeName);
    }
    if (
      upstream.data.curated_cast_show_ids.some(
        (showId) => typeof showId !== "string" || showId.length === 0,
      )
    ) {
      return invalidPublicCoreResponse(routeName);
    }
    return new Set(upstream.data.curated_cast_show_ids);
  }
  if (upstream.status === 404) return new Set();
  return throwPublicCoreStatusError(
    upstream,
    routeName,
    "Failed to load public core curated cast shows",
  );
}

/**
 * Get the full credits dataset used for show-scoped person credit assembly.
 * Fetches all paginated credits in bounded pages and deduplicates by credit id.
 */
export async function getCreditsForPersonShowScope(
  personId: string,
  showId: string,
  options?: { pageSize?: number; maxPages?: number }
): Promise<TrrPersonCredit[]> {
  const pageSize = Math.min(Math.max(options?.pageSize ?? MAX_LIMIT, 1), MAX_LIMIT);
  const maxPages = Math.max(options?.maxPages ?? 40, 1);

  const allCredits: TrrPersonCredit[] = [];
  let offset = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const pageCredits = await getCreditsByPersonId(personId, {
      limit: pageSize,
      offset,
    });
    if (pageCredits.length === 0) break;
    allCredits.push(...pageCredits);
    if (pageCredits.length < pageSize) break;
    offset += pageSize;
  }

  const deduped: TrrPersonCredit[] = [];
  const seen = new Set<string>();
  for (const credit of allCredits) {
    if (seen.has(credit.id)) continue;
    seen.add(credit.id);
    deduped.push(credit);
  }

  // Keep parameter meaningful for this scope helper and aid diagnostics.
  if (!deduped.some((credit) => credit.show_id === showId)) {
    return deduped;
  }
  return deduped;
}

const getAllCorePersonEpisodeCredits = async (
  personId: string,
  options: {
    showId?: string;
    includeArchiveFootage: boolean;
    routeName: string;
  },
): Promise<PersonEpisodeCredit[]> => {
  const allCredits: PersonEpisodeCredit[] = [];
  let offset = 0;
  const maxPages = 40;

  for (let page = 0; page < maxPages; page += 1) {
    const upstream = await fetchPublicCoreJson(
      `/people/${encodeURIComponent(personId)}/episode-credits`,
      {
        routeName: options.routeName,
        queryString: buildPaginationQueryString({
          show_id: options.showId,
          include_archive_footage: options.includeArchiveFootage,
          limit: MAX_LIMIT,
          offset,
        }),
      },
    );
    if (upstream.status === 404) return allCredits;
    if (upstream.status !== 200) {
      return throwPublicCoreStatusError(
        upstream,
        options.routeName,
        "Failed to load public core person episode credits",
      );
    }

    const pageCredits = parseArrayEnvelope(
      upstream.data,
      "episode_credits",
      options.routeName,
      parseCorePersonEpisodeCreditV2,
    ).map(mapCorePersonEpisodeCreditV2);
    allCredits.push(...pageCredits);

    if (upstream.data.has_more === false || pageCredits.length < MAX_LIMIT) break;
    offset += MAX_LIMIT;
  }

  return allCredits;
};

/**
 * Get episode-level credit evidence for a person scoped to a show.
 * Reads from core.v_episode_credits and excludes archive footage by default.
 */
export async function getEpisodeCreditsByPersonShowId(
  personId: string,
  showId: string,
  options?: { includeArchiveFootage?: boolean }
): Promise<PersonShowEpisodeCredit[]> {
  const includeArchiveFootage = options?.includeArchiveFootage ?? false;
  const routeName = "public-core-person-show-episode-credits";
  const credits = await getAllCorePersonEpisodeCredits(personId, {
    showId,
    includeArchiveFootage,
    routeName,
  });
  return credits.map((credit) => mapCorePersonShowEpisodeCreditV2(credit));
}

/**
 * Get episode-level credit evidence for a person across all mapped shows.
 * Reads from core.v_episode_credits and excludes archive footage by default.
 */
export async function getEpisodeCreditsByPersonId(
  personId: string,
  options?: { includeArchiveFootage?: boolean }
): Promise<PersonEpisodeCredit[]> {
  const includeArchiveFootage = options?.includeArchiveFootage ?? false;
  const routeName = "public-core-person-episode-credits";
  return getAllCorePersonEpisodeCredits(personId, {
    includeArchiveFootage,
    routeName,
  });
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
  options?: CastQueryOptions
): Promise<SeasonCastMember[]> {
  const { limit, offset } = normalizePagination(options);
  const season = await getSeasonByShowAndNumber(showId, seasonNumber);
  if (!season) return [];
  const routeName = "public-core-season-cast-membership";
  const upstream = await fetchPublicCoreJson(`/seasons/${encodeURIComponent(season.id)}/cast`, {
    routeName,
    queryString: buildPaginationQueryString({
      view: "membership",
      include_archive_only: false,
      photo_fallback: options?.photoFallbackMode ?? DEFAULT_CAST_PHOTO_FALLBACK_MODE,
      limit,
      offset,
    }),
  });
  if (upstream.status === 200) {
    return parseArrayEnvelope(
      upstream.data,
      "cast",
      routeName,
      parseCoreSeasonCastMemberV2,
    ).map(mapCoreSeasonCastMemberV2);
  }
  if (upstream.status === 404) return [];
  return throwPublicCoreStatusError(upstream, routeName, "Failed to load public core season cast");
}

/**
 * Get cast members who appeared in a specific season with per-season episode counts.
 * Prefers v_season_cast, falls back to v_episode_cast, then v_person_show_seasons for membership-only.
 */
export async function getSeasonCastWithEpisodeCounts(
  showId: string,
  seasonNumber: number,
  options?: CastQueryOptions & { includeArchiveOnly?: boolean }
): Promise<SeasonCastEpisodeCount[]> {
  const { limit, offset } = normalizePagination(options);
  const includeArchiveOnly =
    typeof (options as { includeArchiveOnly?: unknown } | undefined)?.includeArchiveOnly === "boolean"
      ? Boolean((options as { includeArchiveOnly?: boolean }).includeArchiveOnly)
      : false;

  const season = await getSeasonByShowAndNumber(showId, seasonNumber);
  if (!season) return [];
  const routeName = "public-core-season-cast-episode-counts";
  const upstream = await fetchPublicCoreJson(`/seasons/${encodeURIComponent(season.id)}/cast`, {
    routeName,
    queryString: buildPaginationQueryString({
      view: "episode_counts",
      include_archive_only: includeArchiveOnly,
      photo_fallback: options?.photoFallbackMode ?? DEFAULT_CAST_PHOTO_FALLBACK_MODE,
      limit,
      offset,
    }),
  });
  if (upstream.status === 200) {
    return parseArrayEnvelope(
      upstream.data,
      "cast",
      routeName,
      parseCoreSeasonCastEpisodeCountV2,
    ).map(mapCoreSeasonCastEpisodeCountV2);
  }
  if (upstream.status === 404) return [];
  return throwPublicCoreStatusError(
    upstream,
    routeName,
    "Failed to load public core season cast episode counts",
  );
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
  source_url?: string | null;
  kind: string;
  hosted_url: string;
  original_url?: string | null;
  thumb_url?: string | null;
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
  link_id?: string | null;
  media_asset_id?: string | null;
  people_count?: number | null;
  people_count_source?: "auto" | "manual" | null;
  thumbnail_focus_x?: number | null;
  thumbnail_focus_y?: number | null;
  thumbnail_zoom?: number | null;
  thumbnail_crop_mode?: "manual" | "auto" | null;
  logo_black_url?: string | null;
  logo_white_url?: string | null;
  logo_link_is_primary?: boolean | null;
}

export async function getAssetsByShowSeason(
  showId: string,
  seasonNumber: number,
  options: SourcePaginationOptions & { adminContext: VerifiedAdminContext },
): Promise<SeasonAsset[]> {
  const routeName = "admin-show-season-assets";
  const limit = Math.min(Math.max(options.limit ?? MAX_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(options.offset ?? 0, 0);
  const sources = (options.sources ?? [])
    .map((source) => source.trim().toLowerCase())
    .filter(Boolean);
  const upstream = await fetchAdminBackendJson(
    `/admin/shows/${encodeURIComponent(showId)}/seasons/${seasonNumber}/assets`,
    {
      adminContext: options.adminContext,
      apiVersion: "v2",
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName,
      requestRole: "primary",
      queryString: buildPaginationQueryString({
        limit,
        offset,
        ...(sources.length > 0 ? { sources: sources.join(",") } : {}),
        full: options.full === true,
      }),
    },
  );
  if (upstream.status !== 200) {
    throw buildAdminBackendStatusError({
      status: upstream.status,
      data: upstream.data,
      fallbackMessage: "Failed to load show-season assets.",
      routeName,
      requestRole: "primary",
    });
  }
  return parseArrayEnvelope(upstream.data, "assets", routeName, parseSeasonAssetV2);
}
export interface EpisodeSearchEntry {
  id: string;
  title: string | null;
  episode_number: number | null;
  season_number: number | null;
  air_date: string | null;
  show_id: string;
  show_name: string | null;
  show_slug: string;
}

export async function searchEpisodes(
  query: string,
  options?: PaginationOptions
): Promise<EpisodeSearchEntry[]> {
  const { limit, offset } = normalizePagination(options);
  const routeName = "public-core-episodes-list";
  const upstream = await fetchPublicCoreJson("/episodes", {
    routeName,
    queryString: buildPaginationQueryString({ q: query || undefined, limit, offset }),
  });

  if (upstream.status === 200) {
    return parseArrayEnvelope(upstream.data, "episodes", routeName, parseCoreEpisodeV2).map(
      mapCoreEpisodeV2ToSearchEntry,
    );
  }
  if (upstream.status === 404) return [];
  return throwPublicCoreStatusError(upstream, routeName, "Failed to search public core episodes");
}
