import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  invalidateRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import {
  SURVEY_DETAIL_CACHE_NAMESPACE,
  SURVEY_DETAIL_CACHE_TTL_MS,
  SURVEY_SEASON_CAST_CACHE_NAMESPACE,
} from "@/lib/server/admin/survey-route-cache";
import {
  getSurveyBySlug,
  updateSurvey,
} from "@/lib/server/surveys/normalized-survey-admin-repository";
import type { NormalizedSurvey } from "@/lib/surveys/normalized-types";
import { getLinkBySurveyId } from "@/lib/server/surveys/survey-trr-links-repository";
import { getCastByShowSeason, getEpisodesByShowAndSeason, getAssetsByShowSeason } from "@/lib/server/trr-api/trr-shows-repository";
import {
  listSeasonCastSurveyRoles,
  replaceSeasonCastSurveyRoles,
} from "@/lib/server/admin/season-cast-survey-roles-repository";
import { buildAdminReadResponseHeaders } from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";
interface RouteParams {
  params: Promise<{ surveyKey: string }>;
}

/**
 * Transform NormalizedSurvey to the format expected by the admin UI.
 */
function transformSurveyForAdmin(survey: NormalizedSurvey) {
  const metadata = survey.metadata ?? {};
  return {
    id: survey.id,
    key: survey.slug,
    title: survey.title,
    description: survey.description,
    show_id: (metadata.showId as string) ?? null,
    season_number: (metadata.seasonNumber as number) ?? null,
    is_active: survey.is_active,
    theme: (metadata.theme as Record<string, unknown>) ?? null,
    air_schedule: (metadata.airSchedule as {
      airDays: string[];
      airTime: string;
      timezone: string;
      autoProgress: boolean;
    }) ?? null,
    current_episode_id: (metadata.currentEpisodeId as string) ?? null,
    created_at: survey.created_at,
    updated_at: survey.updated_at,
  };
}


type CastTitle = "main" | "friend" | "new" | "alum";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeCastTitle(value: unknown): CastTitle | null {
  if (value === "main" || value === "friend" || value === "new" || value === "alum") {
    return value;
  }
  return null;
}

function parseCastTitlesByPersonId(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, CastTitle> {
  if (!isRecord(metadata)) return {};
  const raw = metadata.castTitlesByPersonId;
  if (!isRecord(raw)) return {};

  const out: Record<string, CastTitle> = {};
  for (const [personId, title] of Object.entries(raw)) {
    const normalized = normalizeCastTitle(title);
    if (normalized) out[personId] = normalized;
  }
  return out;
}

/**
 * GET /api/admin/surveys/[surveyKey]
 * Get full survey configuration including cast and episodes
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const startedAt = performance.now();
    const user = await requireAdmin(request);
    const { surveyKey } = await params;
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");

    const cacheKey = buildUserScopedRouteCacheKey(user.uid, surveyKey, searchParams);
    const promiseKey = forceRefresh ? `${cacheKey}:refresh` : cacheKey;
    if (!forceRefresh) {
      const cached = getRouteResponseCache<Record<string, unknown>>(
        SURVEY_DETAIL_CACHE_NAMESPACE,
        cacheKey,
      );
      if (cached) {
        return NextResponse.json(cached, {
          headers: buildAdminReadResponseHeaders({ cacheStatus: "hit" }),
        });
      }
    }

    const payload = await getOrCreateRouteResponsePromise(
      SURVEY_DETAIL_CACHE_NAMESPACE,
      promiseKey,
      async () => {
        const survey = await getSurveyBySlug(surveyKey);
        if (!survey) {
          return null;
        }

        const includeCast = searchParams.get("includeCast") === "true";
        const includeEpisodes = searchParams.get("includeEpisodes") === "true";
        const includeAssets = searchParams.get("includeAssets") === "true";

        const response: Record<string, unknown> = { survey: transformSurveyForAdmin(survey) };
        const trrLink = await getLinkBySurveyId(survey.id);
        response.trrLink = trrLink;

        const castTitlesByPersonId = parseCastTitlesByPersonId(survey.metadata);
        const currentEpisodeId = survey.metadata?.currentEpisodeId as string | undefined;

        if (trrLink && trrLink.season_number) {
          const castPromise = includeCast
            ? Promise.all([
                getCastByShowSeason(trrLink.trr_show_id, trrLink.season_number, { limit: 50 }),
                listSeasonCastSurveyRoles(trrLink.trr_show_id, trrLink.season_number),
              ]).then(([seasonCast, seasonRoles]) => {
                const roleMap = new Map<string, "main" | "friend_of">(
                  seasonRoles.map((row) => [row.person_id, row.role]),
                );
                return seasonCast.map((member, index) => {
                  const name = member.person_name ?? "Unknown";
                  const role = roleMap.get(member.person_id) ?? null;
                  const status: CastTitle | null =
                    role === "main"
                      ? "main"
                      : role === "friend_of"
                        ? "friend"
                        : (castTitlesByPersonId[member.person_id] ?? null);
                  return {
                    id: member.person_id,
                    name,
                    slug: name.toLowerCase().replace(/\s+/g, "-"),
                    image_url: member.photo_url,
                    role: "Self",
                    status,
                    instagram: null,
                    display_order: index,
                    is_alumni: false,
                    alumni_verdict_enabled: false,
                  };
                });
              })
            : Promise.resolve(null);
          const episodesPromise = includeEpisodes
            ? getEpisodesByShowAndSeason(trrLink.trr_show_id, trrLink.season_number, { limit: 50 }).then((episodes) =>
                episodes.map((ep) => ({
                  id: ep.id,
                  episode_number: ep.episode_number,
                  episode_id: `E${ep.episode_number.toString().padStart(2, "0")}`,
                  episode_label: ep.title,
                  air_date: ep.air_date,
                  opens_at: null,
                  closes_at: null,
                  is_active: true,
                  is_current: currentEpisodeId === ep.id,
                })),
              )
            : Promise.resolve(null);
          const assetsPromise = includeAssets
            ? getAssetsByShowSeason(trrLink.trr_show_id, trrLink.season_number, { limit: 200 })
            : Promise.resolve(null);

          const [cast, episodes, assets] = await Promise.all([
            castPromise,
            episodesPromise,
            assetsPromise,
          ]);

          if (includeCast) {
            response.cast = cast ?? [];
          }
          if (includeEpisodes) {
            response.episodes = episodes ?? [];
          }
          if (includeAssets) {
            response.assets = assets ?? [];
          }
        } else {
          if (includeCast) {
            response.cast = [];
          }
          if (includeEpisodes) {
            response.episodes = [];
          }
          if (includeAssets) {
            response.assets = [];
          }
        }

        setRouteResponseCache(
          SURVEY_DETAIL_CACHE_NAMESPACE,
          cacheKey,
          response,
          SURVEY_DETAIL_CACHE_TTL_MS,
        );
        return response;
      },
    );

    if (!payload) {
      const totalMs = performance.now() - startedAt;
      return NextResponse.json(
        { error: "Survey not found" },
        {
          status: 404,
          headers: buildAdminReadResponseHeaders({
            cacheStatus: forceRefresh ? "refresh" : "miss",
            upstreamMs: totalMs,
            totalMs,
          }),
        },
      );
    }

    const totalMs = performance.now() - startedAt;
    return NextResponse.json(payload, {
      headers: buildAdminReadResponseHeaders({
        cacheStatus: forceRefresh ? "refresh" : "miss",
        upstreamMs: totalMs,
        totalMs,
      }),
    });
  } catch (error) {
    console.error("[api] Failed to get survey", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/admin/surveys/[surveyKey]
 * Update survey configuration
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };
    const { surveyKey } = await params;

    // First get the survey to find its ID
    const survey = await getSurveyBySlug(surveyKey);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      description,
      showId,
      seasonNumber,
      isActive,
      theme,
      airSchedule,
      currentEpisodeId,
      castTitlesByPersonId,
    } = body;

    // Build metadata object from fields
    const existingMetadata = survey.metadata ?? {};
    const metadata: Record<string, unknown> = { ...existingMetadata };

    if (showId !== undefined) metadata.showId = showId;
    if (seasonNumber !== undefined) metadata.seasonNumber = seasonNumber;
    if (theme !== undefined) metadata.theme = theme;
    if (airSchedule !== undefined) metadata.airSchedule = airSchedule;
    if (currentEpisodeId !== undefined) metadata.currentEpisodeId = currentEpisodeId;

    if (castTitlesByPersonId !== undefined) {
      const trrLink = await getLinkBySurveyId(survey.id);

      if (castTitlesByPersonId === null) {
        // Clear legacy metadata + clear season roles if we have a show/season link.
        delete metadata.castTitlesByPersonId;
        if (trrLink && trrLink.season_number) {
          await replaceSeasonCastSurveyRoles(
            authContext,
            trrLink.trr_show_id,
            trrLink.season_number,
            [],
          );
        }
      } else if (!isRecord(castTitlesByPersonId)) {
        return NextResponse.json(
          { error: "castTitlesByPersonId must be an object" },
          { status: 400 },
        );
      } else {
        // Sanitize values before persisting.
        const sanitized: Record<string, CastTitle> = {};
        for (const [personId, title] of Object.entries(castTitlesByPersonId)) {
          const normalized = normalizeCastTitle(title);
          if (normalized) sanitized[personId] = normalized;
        }

        // Prefer persisting to the admin season cast roles table when possible.
        // This is the source of truth for auto-filled "Rank Cast Members" style questions.
        if (trrLink && trrLink.season_number) {
          await replaceSeasonCastSurveyRoles(
            authContext,
            trrLink.trr_show_id,
            trrLink.season_number,
            Object.entries(sanitized)
              .filter(([, title]) => title === "main" || title === "friend")
              .map(([personId, title]) => ({
                personId,
                role: title === "main" ? "main" : "friend_of",
              })),
          );
        } else {
          // If we don't have a TRR season link, fall back to legacy per-survey metadata.
          metadata.castTitlesByPersonId = sanitized;
        }
      }
    }

    const updated = await updateSurvey(authContext, survey.id, {
      title,
      description,
      is_active: isActive,
      metadata,
    });

    if (!updated) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    invalidateRouteResponseCache(SURVEY_DETAIL_CACHE_NAMESPACE, `${user.uid}:${surveyKey}:`);
    if (showId && Number.isFinite(Number(seasonNumber))) {
      invalidateRouteResponseCache(
        SURVEY_SEASON_CAST_CACHE_NAMESPACE,
        `${user.uid}:${showId}:${Number(seasonNumber)}:`,
      );
    }
    return NextResponse.json({ survey: transformSurveyForAdmin(updated) });
  } catch (error) {
    console.error("[api] Failed to update survey", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/admin/surveys/[surveyKey]
 * Soft delete (deactivate) a survey
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };
    const { surveyKey } = await params;

    // First get the survey to find its ID
    const survey = await getSurveyBySlug(surveyKey);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Soft delete by setting is_active to false
    const updated = await updateSurvey(authContext, survey.id, {
      is_active: false,
    });

    if (!updated) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    invalidateRouteResponseCache(SURVEY_DETAIL_CACHE_NAMESPACE, `${user.uid}:${surveyKey}:`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to delete survey", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
