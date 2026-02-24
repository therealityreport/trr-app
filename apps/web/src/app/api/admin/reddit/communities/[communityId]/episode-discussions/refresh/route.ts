import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  RedditDiscoveryError,
  discoverEpisodeDiscussionThreads,
  type RedditListingSort,
} from "@/lib/server/admin/reddit-discovery-service";
import { getRedditCommunityById } from "@/lib/server/admin/reddit-sources-repository";
import {
  getSeasonById,
  getSeasonByShowAndNumber,
  getSeasonsByShowId,
  getShowById,
} from "@/lib/server/trr-api/trr-shows-repository";
import { isValidPositiveIntegerString, isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

const SORTS: RedditListingSort[] = ["new", "hot", "top"];

const parseSortModes = (input: string | null): RedditListingSort[] => {
  if (!input) return SORTS;
  const values = input
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is RedditListingSort => SORTS.includes(value as RedditListingSort));
  const deduped = [...new Set(values)];
  return deduped.length > 0 ? deduped : SORTS;
};

const parseLimit = (value: string | null): number => {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return 65;
  return Math.min(parsed, 80);
};

const parseIsoDateParam = (
  value: string | null,
  field: "period_start" | "period_end",
): { value: string | null; error?: string } => {
  if (!value) return { value: null };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { value: null, error: `${field} must be a valid ISO datetime` };
  }
  return { value: parsed.toISOString() };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { communityId } = await params;
    if (!communityId) {
      return NextResponse.json({ error: "communityId is required" }, { status: 400 });
    }
    if (!isValidUuid(communityId)) {
      return NextResponse.json({ error: "communityId must be a valid UUID" }, { status: 400 });
    }

    const rawSeasonNumber = request.nextUrl.searchParams.get("season_number");
    if (rawSeasonNumber && !isValidPositiveIntegerString(rawSeasonNumber)) {
      return NextResponse.json(
        { error: "season_number must be a positive integer" },
        { status: 400 },
      );
    }
    const seasonNumber = rawSeasonNumber ? Number.parseInt(rawSeasonNumber, 10) : null;

    const seasonId = request.nextUrl.searchParams.get("season_id");
    if (seasonId && !isValidUuid(seasonId)) {
      return NextResponse.json({ error: "season_id must be a valid UUID" }, { status: 400 });
    }

    const legacyShowId = request.nextUrl.searchParams.get("show_id");
    if (legacyShowId && !isValidUuid(legacyShowId)) {
      return NextResponse.json({ error: "show_id must be a valid UUID" }, { status: 400 });
    }

    const parsedPeriodStart = parseIsoDateParam(
      request.nextUrl.searchParams.get("period_start"),
      "period_start",
    );
    if (parsedPeriodStart.error) {
      return NextResponse.json({ error: parsedPeriodStart.error }, { status: 400 });
    }
    const parsedPeriodEnd = parseIsoDateParam(
      request.nextUrl.searchParams.get("period_end"),
      "period_end",
    );
    if (parsedPeriodEnd.error) {
      return NextResponse.json({ error: parsedPeriodEnd.error }, { status: 400 });
    }
    if (
      parsedPeriodStart.value &&
      parsedPeriodEnd.value &&
      new Date(parsedPeriodStart.value).getTime() > new Date(parsedPeriodEnd.value).getTime()
    ) {
      return NextResponse.json(
        { error: "period_start must be before period_end" },
        { status: 400 },
      );
    }

    const community = await getRedditCommunityById(communityId);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    if (legacyShowId && community.trr_show_id !== legacyShowId) {
      return NextResponse.json(
        { error: "show_id does not match selected community" },
        { status: 400 },
      );
    }
    if (legacyShowId) {
      console.warn("[api] Legacy show_id query param used for episode discussion refresh");
    }
    if (rawSeasonNumber) {
      console.warn("[api] Legacy season_number query param used for episode discussion refresh");
    }

    const showId = community.trr_show_id;
    const show = await getShowById(showId);
    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    let resolvedSeason = null;
    if (seasonId) {
      resolvedSeason = await getSeasonById(seasonId);
      if (!resolvedSeason || resolvedSeason.show_id !== showId) {
        return NextResponse.json(
          { error: "season_id must belong to the selected community show" },
          { status: 400 },
        );
      }
    } else if (seasonNumber) {
      resolvedSeason = await getSeasonByShowAndNumber(showId, seasonNumber);
      if (!resolvedSeason) {
        return NextResponse.json(
          { error: "No season found for season_number on the selected show" },
          { status: 404 },
        );
      }
    } else {
      const latest = await getSeasonsByShowId(showId, { limit: 1, offset: 0 });
      resolvedSeason = latest[0] ?? null;
      if (!resolvedSeason) {
        return NextResponse.json(
          { error: "No seasons found for the selected show" },
          { status: 404 },
        );
      }
    }
    if (!resolvedSeason) {
      return NextResponse.json({ error: "No season resolved" }, { status: 404 });
    }

    const discovery = await discoverEpisodeDiscussionThreads({
      subreddit: community.subreddit,
      showName: show.name,
      showAliases: show.alternative_names,
      seasonNumber: resolvedSeason.season_number,
      episodeTitlePatterns: community.episode_title_patterns,
      episodeRequiredFlares: community.analysis_all_flares,
      isShowFocused: community.is_show_focused,
      periodStart: parsedPeriodStart.value,
      periodEnd: parsedPeriodEnd.value,
      sortModes: parseSortModes(request.nextUrl.searchParams.get("sort")),
      limitPerMode: parseLimit(request.nextUrl.searchParams.get("limit")),
    });

    return NextResponse.json({
      community,
      candidates: discovery.candidates,
      meta: {
        fetched_at: discovery.fetched_at,
        total_found: discovery.candidates.length,
        filters_applied: discovery.filters_applied,
        season_context: {
          season_id: resolvedSeason.id,
          season_number: resolvedSeason.season_number,
        },
        period_context: {
          selected_window_start:
            parsedPeriodStart.value ?? discovery.filters_applied.period_start ?? null,
          selected_window_end:
            parsedPeriodEnd.value ?? discovery.filters_applied.period_end ?? null,
          selected_period_labels:
            request.nextUrl.searchParams.getAll("period_label").filter(Boolean) ?? [],
        },
      },
    });
  } catch (error) {
    console.error("[api] Failed to refresh reddit episode discussions", error);
    if (error instanceof RedditDiscoveryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
