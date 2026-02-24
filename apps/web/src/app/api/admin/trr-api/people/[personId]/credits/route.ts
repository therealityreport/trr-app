import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  type PersonShowEpisodeCredit,
  type TrrPersonCredit,
  getCreditsByPersonId,
  getEpisodeCreditsByPersonShowId,
} from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ personId: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ShowScopeEpisode = {
  episode_id: string;
  episode_number: number | null;
  episode_name: string | null;
  appearance_type: string | null;
};

type ShowScopeSeason = {
  season_number: number | null;
  episode_count: number;
  episodes: ShowScopeEpisode[];
};

type ShowScopeCreditGroup = {
  credit_id: string;
  role: string | null;
  credit_category: string;
  billing_order: number | null;
  source_type: string | null;
  total_episodes: number;
  seasons: ShowScopeSeason[];
};

type ShowScopePayload = {
  show_id: string;
  show_name: string | null;
  cast_groups: ShowScopeCreditGroup[];
  crew_groups: ShowScopeCreditGroup[];
  cast_non_episodic: TrrPersonCredit[];
  crew_non_episodic: TrrPersonCredit[];
  other_show_credits: TrrPersonCredit[];
};

const isCastCategory = (value: string | null | undefined): boolean =>
  (value ?? "").trim().toLowerCase() === "self";

const isBlankRole = (value: string | null | undefined): boolean =>
  (value ?? "").trim().length === 0;

const compareNullableAscNullLast = (a: number | null, b: number | null): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
};

const compareNullableDescNullLast = (a: number | null, b: number | null): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
};

const sortCreditGroups = (groups: ShowScopeCreditGroup[]): ShowScopeCreditGroup[] =>
  groups.sort((a, b) => {
    const byBilling = compareNullableAscNullLast(a.billing_order, b.billing_order);
    if (byBilling !== 0) return byBilling;
    const byRole = (a.role ?? "").localeCompare(b.role ?? "");
    if (byRole !== 0) return byRole;
    return a.credit_id.localeCompare(b.credit_id);
  });

const buildShowScopePayload = (
  showId: string,
  credits: TrrPersonCredit[],
  episodeCredits: PersonShowEpisodeCredit[]
): ShowScopePayload => {
  const showCredits = credits.filter((credit) => credit.show_id === showId);
  const otherShowCredits = credits.filter((credit) => credit.show_id !== showId);
  const showName = showCredits.find((credit) => credit.show_name)?.show_name ?? null;
  const hasExplicitCastRole = showCredits.some(
    (credit) =>
      isCastCategory(credit.credit_category) &&
      !isBlankRole(credit.role)
  );

  const episodeRowsByCreditId = new Map<string, PersonShowEpisodeCredit[]>();
  for (const row of episodeCredits) {
    const list = episodeRowsByCreditId.get(row.credit_id);
    if (list) {
      list.push(row);
    } else {
      episodeRowsByCreditId.set(row.credit_id, [row]);
    }
  }

  const castGroups: ShowScopeCreditGroup[] = [];
  const crewGroups: ShowScopeCreditGroup[] = [];
  const castNonEpisodic: TrrPersonCredit[] = [];
  const crewNonEpisodic: TrrPersonCredit[] = [];

  for (const credit of showCredits) {
    const evidenceRows = episodeRowsByCreditId.get(credit.id) ?? [];
    const isCastFromCredit = isCastCategory(credit.credit_category);
    const isCastFromEvidence = evidenceRows.some((row) =>
      isCastCategory(row.credit_category)
    );
    const isCast = isCastFromCredit || isCastFromEvidence;
    const normalizedCategory = isCastFromEvidence
      ? "Self"
      : credit.credit_category;

    if (hasExplicitCastRole && isCast && isBlankRole(credit.role)) {
      continue;
    }

    if (evidenceRows.length === 0) {
      if (isCast) {
        castNonEpisodic.push(credit);
      } else {
        crewNonEpisodic.push(credit);
      }
      continue;
    }

    const episodesSeen = new Set<string>();
    const seasonsMap = new Map<number | null, ShowScopeEpisode[]>();
    for (const row of evidenceRows) {
      if (episodesSeen.has(row.episode_id)) continue;
      episodesSeen.add(row.episode_id);

      const seasonKey = row.season_number ?? null;
      const seasonEpisodes = seasonsMap.get(seasonKey) ?? [];
      seasonEpisodes.push({
        episode_id: row.episode_id,
        episode_number: row.episode_number,
        episode_name: row.episode_name,
        appearance_type: row.appearance_type,
      });
      seasonsMap.set(seasonKey, seasonEpisodes);
    }

    const seasons = Array.from(seasonsMap.entries())
      .map(([seasonNumber, episodes]) => ({
        season_number: seasonNumber,
        episode_count: episodes.length,
        episodes: [...episodes].sort((a, b) => {
          const byEpisode = compareNullableAscNullLast(a.episode_number, b.episode_number);
          if (byEpisode !== 0) return byEpisode;
          const byName = (a.episode_name ?? "").localeCompare(b.episode_name ?? "");
          if (byName !== 0) return byName;
          return a.episode_id.localeCompare(b.episode_id);
        }),
      }))
      .sort((a, b) => compareNullableDescNullLast(a.season_number, b.season_number));

    const group: ShowScopeCreditGroup = {
      credit_id: credit.id,
      role: credit.role,
      credit_category: normalizedCategory,
      billing_order: credit.billing_order,
      source_type: credit.source_type ?? null,
      total_episodes: seasons.reduce((sum, season) => sum + season.episode_count, 0),
      seasons,
    };

    if (isCast) {
      castGroups.push(group);
    } else {
      crewGroups.push(group);
    }
  }

  return {
    show_id: showId,
    show_name: showName,
    cast_groups: sortCreditGroups(castGroups),
    crew_groups: sortCreditGroups(crewGroups),
    cast_non_episodic: castNonEpisodic,
    crew_non_episodic: crewNonEpisodic,
    other_show_credits: otherShowCredits,
  };
};

/**
 * GET /api/admin/trr-api/people/[personId]/credits
 *
 * Get all show credits for a person from TRR Core API.
 *
 * Query params:
 * - limit: max results (default 50, max 100)
 * - offset: pagination offset (default 0)
 * - showId: optional show UUID for show-scoped cast/crew episode grouping
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId } = await params;

    if (!personId) {
      return NextResponse.json(
        { error: "personId is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const showIdRaw = searchParams.get("showId");
    const showId =
      typeof showIdRaw === "string" && showIdRaw.trim().length > 0
        ? showIdRaw.trim()
        : null;

    if (showId && !UUID_RE.test(showId)) {
      return NextResponse.json(
        { error: "showId must be a UUID" },
        { status: 400 }
      );
    }

    const credits = await getCreditsByPersonId(personId, { limit, offset });
    const showScope =
      showId
        ? buildShowScopePayload(
            showId,
            credits,
            await getEpisodeCreditsByPersonShowId(personId, showId, {
              includeArchiveFootage: false,
            })
          )
        : null;

    return NextResponse.json({
      credits,
      ...(showScope ? { show_scope: showScope } : {}),
      pagination: {
        limit,
        offset,
        count: credits.length,
      },
    });
  } catch (error) {
    console.error("[api] Failed to get TRR person credits", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
