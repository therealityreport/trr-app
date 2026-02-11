import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { getSeasonCastWithEpisodeCounts } from "@/lib/server/trr-api/trr-shows-repository";
import {
  listSeasonCastSurveyRoles,
  replaceSeasonCastSurveyRoles,
  upsertSeasonCastSurveyRole,
  deleteSeasonCastSurveyRole,
  type SeasonSurveyCastRole,
} from "@/lib/server/admin/season-cast-survey-roles-repository";
import type { AuthContext } from "@/lib/server/postgres";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string }>;
}

type CastItem = {
  person_id: string;
  person_name: string | null;
  episodes_in_season: number;
  total_episodes: number | null;
  photo_url: string | null;
  survey_role: SeasonSurveyCastRole | null;
};

function parseSelectedOnly(searchParams: URLSearchParams): boolean {
  const raw = (searchParams.get("selectedOnly") ?? "").toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function isSeasonSurveyRole(value: unknown): value is SeasonSurveyCastRole {
  return value === "main" || value === "friend_of";
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { showId, seasonNumber } = await params;
    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    const seasonNum = Number.parseInt(seasonNumber, 10);
    if (!Number.isFinite(seasonNum)) {
      return NextResponse.json({ error: "seasonNumber is invalid" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const selectedOnly = parseSelectedOnly(searchParams);

    const [cast, roles] = await Promise.all([
      getSeasonCastWithEpisodeCounts(showId, seasonNum, { limit: 500, offset: 0 }),
      listSeasonCastSurveyRoles(showId, seasonNum),
    ]);

    const roleMap = new Map<string, SeasonSurveyCastRole>();
    for (const row of roles) roleMap.set(row.person_id, row.role);

    const merged: CastItem[] = cast
      .map((member) => ({
        ...member,
        survey_role: roleMap.get(member.person_id) ?? null,
      }))
      .filter((member) => (selectedOnly ? Boolean(member.survey_role) : true));

    // Sort: main, friend_of, excluded; within each: episodes desc then name asc.
    const roleRank = (role: SeasonSurveyCastRole | null): number => {
      if (role === "main") return 0;
      if (role === "friend_of") return 1;
      return 2;
    };
    merged.sort((a, b) => {
      const byRole = roleRank(a.survey_role) - roleRank(b.survey_role);
      if (byRole !== 0) return byRole;
      const byEpisodes = b.episodes_in_season - a.episodes_in_season;
      if (byEpisodes !== 0) return byEpisodes;
      const aName = (a.person_name ?? "").toLowerCase();
      const bName = (b.person_name ?? "").toLowerCase();
      return aName.localeCompare(bName);
    });

    return NextResponse.json({ cast: merged, selectedOnly });
  } catch (error) {
    console.error("[api] Failed to get season survey cast", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

type PutBody = {
  mode: "patch" | "replace";
  roles: Array<{ person_id: string; role: SeasonSurveyCastRole | null }>;
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };

    const { showId, seasonNumber } = await params;
    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    const seasonNum = Number.parseInt(seasonNumber, 10);
    if (!Number.isFinite(seasonNum)) {
      return NextResponse.json({ error: "seasonNumber is invalid" }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as PutBody | null;
    if (!body || (body.mode !== "patch" && body.mode !== "replace") || !Array.isArray(body.roles)) {
      return NextResponse.json(
        { error: "Invalid body: expected { mode: 'patch'|'replace', roles: [...] }" },
        { status: 400 },
      );
    }

    // Basic validation / normalization
    const normalized = body.roles
      .filter((r): r is { person_id: string; role: SeasonSurveyCastRole | null } => Boolean(r && typeof r.person_id === "string"))
      .map((r) => ({
        person_id: r.person_id,
        role: isSeasonSurveyRole(r.role) ? r.role : null,
      }));

    if (body.mode === "replace") {
      await replaceSeasonCastSurveyRoles(
        authContext,
        showId,
        seasonNum,
        normalized
          .filter((r): r is { person_id: string; role: SeasonSurveyCastRole } => Boolean(r.role))
          .map((r) => ({ personId: r.person_id, role: r.role })),
      );
    } else {
      for (const entry of normalized) {
        if (entry.role === null) {
          await deleteSeasonCastSurveyRole(authContext, {
            trrShowId: showId,
            seasonNumber: seasonNum,
            personId: entry.person_id,
          });
        } else {
          await upsertSeasonCastSurveyRole(authContext, {
            trrShowId: showId,
            seasonNumber: seasonNum,
            personId: entry.person_id,
            role: entry.role,
          });
        }
      }
    }

    const roles = await listSeasonCastSurveyRoles(showId, seasonNum);
    return NextResponse.json({ roles });
  } catch (error) {
    console.error("[api] Failed to update season survey cast roles", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

