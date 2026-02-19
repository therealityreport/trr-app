import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getCoverPhotos } from "@/lib/server/admin/person-cover-photos-repository";
import {
  getCastByShowId,
  getShowArchiveFootageCast,
  getShowCastWithStats,
} from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

const DEFAULT_MIN_EPISODES = 1;
const SHOW_FALLBACK_WARNING =
  "Episode-credit evidence is missing or stale. Showing approximate show-level cast until cast/credits sync succeeds.";

type CastSource = "episode_evidence" | "show_fallback" | "imdb_show_membership";
type CastRosterMode = "episode_evidence" | "imdb_show_membership";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

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
 * - requireImage: filter to cast with at least 1 image URL
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { showId } = await params;

    if (!showId) {
      return NextResponse.json(
        { error: "showId is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const minEpisodes = searchParams.get("minEpisodes");
    const hasExplicitMinEpisodes = searchParams.has("minEpisodes");
    const requireImage = searchParams.get("requireImage");
    const rosterModeRaw = String(searchParams.get("roster_mode") ?? "")
      .trim()
      .toLowerCase();
    const rosterMode: CastRosterMode =
      rosterModeRaw === "imdb_show_membership" ? "imdb_show_membership" : "episode_evidence";

    const parsedMinEpisodes = minEpisodes ? parseInt(minEpisodes, 10) : DEFAULT_MIN_EPISODES;
    const minEpisodesValue =
      Number.isFinite(parsedMinEpisodes) && parsedMinEpisodes >= 0
        ? parsedMinEpisodes
        : DEFAULT_MIN_EPISODES;

    const [episodeEvidenceCast, archiveCast, membershipCast] = await Promise.all([
      getShowCastWithStats(showId, { limit, offset }),
      getShowArchiveFootageCast(showId, { limit, offset }),
      rosterMode === "imdb_show_membership"
        ? getCastByShowId(showId, { limit, offset })
        : Promise.resolve([]),
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

    if (rosterMode === "episode_evidence" && !hasExplicitMinEpisodes && cast.length === 0) {
      const fallbackCast = await getCastByShowId(showId, { limit, offset });
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

    return NextResponse.json({
      cast: castWithCover,
      archive_footage_cast: archiveCastWithCover,
      cast_source: castSource,
      eligibility_warning: eligibilityWarning,
      pagination: {
        limit,
        offset,
        count: castWithCover.length,
      },
    });
  } catch (error) {
    console.error("[api] Failed to get TRR cast", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
