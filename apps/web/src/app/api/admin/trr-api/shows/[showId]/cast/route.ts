import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getCoverPhotos } from "@/lib/server/admin/person-cover-photos-repository";
import { resolveAdminShowId } from "@/lib/server/admin/resolve-show-id";
import {
  buildUserScopedRouteCacheKey,
  getRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  type CastPhotoFallbackMode,
  type CastPhotoLookupDiagnostics,
  getCastByShowId,
  getShowArchiveFootageCast,
  getShowCastWithStats,
} from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

const DEFAULT_MIN_EPISODES = 1;
const CAST_ROUTE_CACHE_NAMESPACE = "admin-show-cast";
const CAST_ROUTE_CACHE_TTL_MS = parseCacheTtlMs(process.env.TRR_ADMIN_SHOW_CAST_CACHE_TTL_MS);
const SHOW_FALLBACK_WARNING =
  "Episode-credit evidence is missing or stale. Showing approximate show-level cast until cast/credits sync succeeds.";

type CastSource = "episode_evidence" | "show_fallback" | "imdb_show_membership";
type CastRosterMode = "episode_evidence" | "imdb_show_membership";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

const CAST_PERF_LOGS_ENABLED = /^(1|true)$/i.test(process.env.TRR_CAST_PERF_LOGS ?? "");

const createPhotoLookupDiagnostics = (): CastPhotoLookupDiagnostics => ({
  media_links_query_ms: 0,
  cast_photos_query_ms: 0,
  people_query_ms: 0,
  bravo_links_query_ms: 0,
  bravo_profile_fetch_ms: 0,
  bravo_profiles_attempted: 0,
  bravo_profiles_resolved: 0,
});

const parsePhotoFallbackMode = (value: string | null): CastPhotoFallbackMode =>
  value?.trim().toLowerCase() === "bravo" ? "bravo" : "none";

/**
 * GET /api/admin/trr-api/shows/[showId]/cast
 *
 * List cast members for a show from TRR Core API.
 * Ordered by billing_order ASC.
 * Includes photo URLs when available.
 *
 * Query params:
 * - limit: max results (default 20, max 500)
 * - offset: pagination offset (default 0)
 * - minEpisodes: filter to cast with at least N total episodes
 * - exclude_zero_episode_members: when true, always remove members with <=0 regular episodes
 * - requireImage: filter to cast with at least 1 image URL
 * - photo_fallback: none|bravo (default none)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestStartedAt = Date.now();
  try {
    const user = await requireAdmin(request);

    const { showId: rawShowId } = await params;
    const showId = await resolveAdminShowId(rawShowId);

    if (!showId) {
      return NextResponse.json(
        { error: `Show not found for "${rawShowId}".` },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cacheKey = buildUserScopedRouteCacheKey(
      user.uid,
      `${showId}:list`,
      request.nextUrl.searchParams,
    );
    const cachedData = getRouteResponseCache<unknown>(CAST_ROUTE_CACHE_NAMESPACE, cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData, { headers: { "x-trr-cache": "hit" } });
    }
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const minEpisodes = searchParams.get("minEpisodes");
    const hasExplicitMinEpisodes = searchParams.has("minEpisodes");
    const excludeZeroEpisodeMembers =
      String(searchParams.get("exclude_zero_episode_members") ?? "").trim().toLowerCase() === "1" ||
      String(searchParams.get("exclude_zero_episode_members") ?? "").trim().toLowerCase() === "true";
    const requireImage = searchParams.get("requireImage");
    const rosterModeRaw = String(searchParams.get("roster_mode") ?? "")
      .trim()
      .toLowerCase();
    const rosterMode: CastRosterMode =
      rosterModeRaw === "imdb_show_membership" ? "imdb_show_membership" : "episode_evidence";
    const photoFallbackMode = parsePhotoFallbackMode(searchParams.get("photo_fallback"));

    const parsedMinEpisodes = minEpisodes ? parseInt(minEpisodes, 10) : DEFAULT_MIN_EPISODES;
    const minEpisodesValue =
      Number.isFinite(parsedMinEpisodes) && parsedMinEpisodes >= 0
        ? parsedMinEpisodes
        : DEFAULT_MIN_EPISODES;

    const episodeEvidenceDiagnostics = createPhotoLookupDiagnostics();
    const archiveDiagnostics = createPhotoLookupDiagnostics();
    const membershipDiagnostics = createPhotoLookupDiagnostics();
    const fallbackDiagnostics = createPhotoLookupDiagnostics();

    let episodeEvidenceQueryMs = 0;
    let archiveQueryMs = 0;
    let membershipQueryMs = 0;
    let fallbackQueryMs = 0;

    const episodeEvidencePromise = (async () => {
      const startedAt = Date.now();
      try {
        return await getShowCastWithStats(showId, {
          limit,
          offset,
          photoFallbackMode,
          photoLookupDiagnostics: episodeEvidenceDiagnostics,
        });
      } finally {
        episodeEvidenceQueryMs = Date.now() - startedAt;
      }
    })();

    const archivePromise = (async () => {
      const startedAt = Date.now();
      try {
        return await getShowArchiveFootageCast(showId, {
          limit,
          offset,
          photoFallbackMode,
          photoLookupDiagnostics: archiveDiagnostics,
        });
      } finally {
        archiveQueryMs = Date.now() - startedAt;
      }
    })();

    const membershipPromise = rosterMode === "imdb_show_membership"
      ? (async () => {
          const startedAt = Date.now();
          try {
            return await getCastByShowId(showId, {
              limit,
              offset,
              photoFallbackMode,
              photoLookupDiagnostics: membershipDiagnostics,
            });
          } finally {
            membershipQueryMs = Date.now() - startedAt;
          }
        })()
      : Promise.resolve([]);

    const [episodeEvidenceCast, archiveCast, membershipCast] = await Promise.all([
      episodeEvidencePromise,
      archivePromise,
      membershipPromise,
    ]);

    const evidenceByPersonId = new Map(
      episodeEvidenceCast.map((evidence) => [evidence.person_id, evidence] as const)
    );

    let cast =
      rosterMode === "imdb_show_membership"
        ? membershipCast.map((member) => {
            const evidence = evidenceByPersonId.get(member.person_id);
            if (!evidence) return member;

            const merged = { ...member } as typeof member & Record<string, unknown>;
            merged.total_episodes =
              typeof evidence.total_episodes === "number"
                ? evidence.total_episodes
                : member.total_episodes ?? null;
            merged.archive_episode_count =
              typeof evidence.archive_episode_count === "number"
                ? evidence.archive_episode_count
                : member.archive_episode_count ?? null;

            const evidenceRecord = evidence as unknown as Record<string, unknown>;
            const latestSeason = evidenceRecord.latest_season;
            const seasonsAppeared = evidenceRecord.seasons_appeared;
            if (typeof latestSeason === "number" && Number.isFinite(latestSeason)) {
              merged.latest_season = latestSeason;
            }
            if (Array.isArray(seasonsAppeared)) {
              merged.seasons_appeared = seasonsAppeared;
            }

            return merged as typeof member;
          })
        : episodeEvidenceCast;
    let castSource: CastSource =
      rosterMode === "imdb_show_membership" ? "imdb_show_membership" : "episode_evidence";
    let eligibilityWarning: string | null = null;

    if (Number.isFinite(minEpisodesValue)) {
      cast = cast.filter(
        (member) =>
          Number(
            (member as { total_episodes?: number | null }).total_episodes ?? 0
          ) >= minEpisodesValue
      );
    }

    if (excludeZeroEpisodeMembers) {
      cast = cast.filter(
        (member) => Number((member as { total_episodes?: number | null }).total_episodes ?? 0) > 0
      );
    }

    if (rosterMode === "episode_evidence" && !hasExplicitMinEpisodes && cast.length === 0) {
      const fallbackStartedAt = Date.now();
      const fallbackCast = await getCastByShowId(showId, {
        limit,
        offset,
        photoFallbackMode,
        photoLookupDiagnostics: fallbackDiagnostics,
      });
      fallbackQueryMs = Date.now() - fallbackStartedAt;
      if (fallbackCast.length > 0) {
        cast = fallbackCast;
        castSource = "show_fallback";
        eligibilityWarning = SHOW_FALLBACK_WARNING;
      }
    }

    if (requireImage === "true" || requireImage === "1") {
      cast = cast.filter((member) => Boolean(member.photo_url));
    }

    let castWithCover = cast;
    let archiveCastWithCover = archiveCast;

    if (cast.length > 0 || archiveCast.length > 0) {
      const personIds = [
        ...new Set([...cast, ...archiveCast].map((member) => member.person_id)),
      ];
      try {
        const coverPhotos = await getCoverPhotos(personIds);
        castWithCover = cast.map((member) => ({
          ...member,
          cover_photo_url: coverPhotos.get(member.person_id)?.photo_url ?? null,
        }));
        archiveCastWithCover = archiveCast.map((member) => ({
          ...member,
          cover_photo_url: coverPhotos.get(member.person_id)?.photo_url ?? null,
        }));
      } catch (error) {
        console.error("[api] Failed to load cover photos for cast", error);
        castWithCover = cast.map((member) => ({
          ...member,
          cover_photo_url: null,
        }));
        archiveCastWithCover = archiveCast.map((member) => ({
          ...member,
          cover_photo_url: null,
        }));
      }
    }

    if (requireImage === "true" || requireImage === "1") {
      archiveCastWithCover = archiveCastWithCover.filter((member) => Boolean(member.photo_url));
    }

    if (CAST_PERF_LOGS_ENABLED) {
      const diagnostics = [
        episodeEvidenceDiagnostics,
        archiveDiagnostics,
        membershipDiagnostics,
        fallbackDiagnostics,
      ];
      const dbQueriesMs = diagnostics.reduce(
        (sum, metric) =>
          sum +
          metric.media_links_query_ms +
          metric.cast_photos_query_ms +
          metric.people_query_ms +
          metric.bravo_links_query_ms,
        0
      );
      const externalFetchMs = diagnostics.reduce(
        (sum, metric) => sum + metric.bravo_profile_fetch_ms,
        0
      );
      const externalFetchAttempted = diagnostics.reduce(
        (sum, metric) => sum + metric.bravo_profiles_attempted,
        0
      );
      const externalFetchResolved = diagnostics.reduce(
        (sum, metric) => sum + metric.bravo_profiles_resolved,
        0
      );

      console.info(
        "[show_cast_api_timing]",
        JSON.stringify({
          show_id: showId,
          roster_mode: rosterMode,
          photo_fallback: photoFallbackMode,
          cast_source: castSource,
          total_ms: Date.now() - requestStartedAt,
          repo_call_ms: {
            episode_evidence: episodeEvidenceQueryMs,
            archive_cast: archiveQueryMs,
            membership_cast: membershipQueryMs,
            fallback_cast: fallbackQueryMs,
          },
          db_queries_ms: dbQueriesMs,
          photo_map_stage_ms: dbQueriesMs + externalFetchMs,
          external_fetch_ms: externalFetchMs,
          external_fetch_attempted: externalFetchAttempted,
          external_fetch_resolved: externalFetchResolved,
          cast_count: castWithCover.length,
          archive_cast_count: archiveCastWithCover.length,
        })
      );
    }

    const responsePayload = {
      cast: castWithCover,
      archive_footage_cast: archiveCastWithCover,
      cast_source: castSource,
      eligibility_warning: eligibilityWarning,
      pagination: {
        limit,
        offset,
        count: castWithCover.length,
      },
    };
    setRouteResponseCache(CAST_ROUTE_CACHE_NAMESPACE, cacheKey, responsePayload, CAST_ROUTE_CACHE_TTL_MS);
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("[api] Failed to get TRR cast", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
