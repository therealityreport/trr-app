import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  RedditDiscoveryError,
  discoverEpisodeDiscussionThreads,
  type RedditListingSort,
} from "@/lib/server/admin/reddit-discovery-service";
import { getRedditCommunityById } from "@/lib/server/admin/reddit-sources-repository";
import { resolveEpisodeDiscussionRules } from "@/lib/server/admin/reddit-episode-rules";
import {
  getSeasonById,
  getSeasonsByShowId,
  getShowById,
} from "@/lib/server/trr-api/trr-shows-repository";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

const SORTS: RedditListingSort[] = ["new", "hot", "top"];
const MAX_PERIOD_LABELS = 5;
const MAX_PERIOD_LABEL_LENGTH = 120;

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

const sanitizePeriodLabels = (values: string[]): string[] => {
  const deduped = new Set<string>();
  const output: string[] = [];
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const normalized = raw.replace(/\s+/g, " ").trim().slice(0, MAX_PERIOD_LABEL_LENGTH);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (deduped.has(key)) continue;
    deduped.add(key);
    output.push(normalized);
    if (output.length >= MAX_PERIOD_LABELS) {
      break;
    }
  }
  return output;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const requestStartedAt = Date.now();
    await requireAdmin(request);

    const { communityId } = await params;
    if (!communityId) {
      return NextResponse.json({ error: "communityId is required" }, { status: 400 });
    }
    if (!isValidUuid(communityId)) {
      return NextResponse.json({ error: "communityId must be a valid UUID" }, { status: 400 });
    }

    const rawSeasonNumber = request.nextUrl.searchParams.get("season_number");
    const legacyShowId = request.nextUrl.searchParams.get("show_id");
    if (legacyShowId || rawSeasonNumber) {
      return NextResponse.json(
        {
          error:
            "Legacy params show_id/season_number are no longer supported. Use communityId with optional season_id.",
        },
        { status: 400 },
      );
    }

    const seasonId = request.nextUrl.searchParams.get("season_id");
    if (seasonId && !isValidUuid(seasonId)) {
      return NextResponse.json({ error: "season_id must be a valid UUID" }, { status: 400 });
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

    const resolvedRules = resolveEpisodeDiscussionRules({
      subreddit: community.subreddit,
      showName: show.name,
      showAliases: show.alternative_names,
      isShowFocused: community.is_show_focused,
      episodeTitlePatterns: community.episode_title_patterns,
      analysisAllFlares: community.analysis_all_flares,
    });

    const discovery = await discoverEpisodeDiscussionThreads({
      subreddit: community.subreddit,
      showName: show.name,
      showAliases: show.alternative_names,
      seasonNumber: resolvedSeason.season_number,
      episodeTitlePatterns: resolvedRules.effectiveEpisodeTitlePatterns,
      episodeRequiredFlares: resolvedRules.effectiveRequiredFlares,
      isShowFocused: community.is_show_focused,
      periodStart: parsedPeriodStart.value,
      periodEnd: parsedPeriodEnd.value,
      sortModes: parseSortModes(request.nextUrl.searchParams.get("sort")),
      limitPerMode: parseLimit(request.nextUrl.searchParams.get("limit")),
    });

    const selectedPeriodLabels = sanitizePeriodLabels(
      request.nextUrl.searchParams.getAll("period_label"),
    );

    console.info("[reddit_episode_refresh_complete]", {
      community_id: communityId,
      show_id: showId,
      season_id: resolvedSeason.id,
      season_number: resolvedSeason.season_number,
      subreddit: community.subreddit,
      successful_sorts: discovery.successful_sorts,
      failed_sorts: discovery.failed_sorts,
      rate_limited_sorts: discovery.rate_limited_sorts,
      candidates_found: discovery.candidates.length,
      duration_ms: Date.now() - requestStartedAt,
    });

    return NextResponse.json({
      community,
      candidates: discovery.candidates,
      episode_matrix: discovery.episode_matrix,
      meta: {
        fetched_at: discovery.fetched_at,
        total_found: discovery.candidates.length,
        filters_applied: discovery.filters_applied,
        effective_episode_title_patterns: resolvedRules.effectiveEpisodeTitlePatterns,
        effective_required_flares: resolvedRules.effectiveRequiredFlares,
        auto_seeded_required_flares: resolvedRules.autoSeededRequiredFlares,
        successful_sorts: discovery.successful_sorts,
        failed_sorts: discovery.failed_sorts,
        rate_limited_sorts: discovery.rate_limited_sorts,
        season_context: {
          season_id: resolvedSeason.id,
          season_number: resolvedSeason.season_number,
        },
        period_context: {
          selected_window_start:
            parsedPeriodStart.value ?? discovery.filters_applied.period_start ?? null,
          selected_window_end:
            parsedPeriodEnd.value ?? discovery.filters_applied.period_end ?? null,
          selected_period_labels: selectedPeriodLabels,
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
