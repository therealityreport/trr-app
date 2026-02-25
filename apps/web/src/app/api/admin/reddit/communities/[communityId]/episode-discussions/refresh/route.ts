import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  RedditDiscoveryError,
  discoverEpisodeDiscussionThreads,
  type RedditListingSort,
} from "@/lib/server/admin/reddit-discovery-service";
import type { AuthContext } from "@/lib/server/postgres";
import {
  createRedditThread,
  getRedditCommunityById,
} from "@/lib/server/admin/reddit-sources-repository";
import { resolveEpisodeDiscussionRules } from "@/lib/server/admin/reddit-episode-rules";
import {
  getEpisodesBySeasonId,
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
const EPISODE_SYNC_TIME_ZONE = "America/New_York";
type SyncCandidateStatus = "auto_saved" | "skipped_conflict" | "not_eligible";
type SyncCandidateReasonCode =
  | "auto_saved_success"
  | "already_saved_other_community"
  | "author_not_automoderator"
  | "title_missing_episode_discussion"
  | "missing_episode_air_date"
  | "missing_post_timestamp"
  | "invalid_post_timestamp"
  | "posted_date_mismatch";

interface SyncCandidateResult {
  reddit_post_id: string;
  status: SyncCandidateStatus;
  reason_code: SyncCandidateReasonCode;
  reason: string;
}

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

const parseBoolean = (input: string | null): boolean => {
  if (!input) return false;
  const normalized = input.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const formatDateKeyInTimeZone = (value: string, timeZone: string): string | null => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(parsed);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
};

const normalizeAirDateKey = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const direct = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (direct) {
    return `${direct[1]}-${direct[2]}-${direct[3]}`;
  }
  return formatDateKeyInTimeZone(trimmed, EPISODE_SYNC_TIME_ZONE);
};

const evaluateEpisodeSyncEligibility = (input: {
  author: string | null;
  title: string;
  postedAt: string | null;
  episodeAirDateKey: string | null;
}): { eligible: boolean; reason: string; reasonCode: SyncCandidateReasonCode } => {
  if ((input.author ?? "").trim().toLowerCase() !== "automoderator") {
    return {
      eligible: false,
      reason: "Author is not AutoModerator.",
      reasonCode: "author_not_automoderator",
    };
  }
  if (!/episode discussion/i.test(input.title)) {
    return {
      eligible: false,
      reason: "Title does not include 'Episode Discussion'.",
      reasonCode: "title_missing_episode_discussion",
    };
  }
  if (!input.postedAt || !input.episodeAirDateKey) {
    if (!input.episodeAirDateKey) {
      return {
        eligible: false,
        reason: "No episode air date found for parsed episode number.",
        reasonCode: "missing_episode_air_date",
      };
    }
    return {
      eligible: false,
      reason: "Post timestamp is missing.",
      reasonCode: "missing_post_timestamp",
    };
  }
  const postedDateKey = formatDateKeyInTimeZone(input.postedAt, EPISODE_SYNC_TIME_ZONE);
  if (!postedDateKey) {
    return {
      eligible: false,
      reason: "Post timestamp is invalid.",
      reasonCode: "invalid_post_timestamp",
    };
  }
  if (postedDateKey !== input.episodeAirDateKey) {
    return {
      eligible: false,
      reason: `Post date ${postedDateKey} does not match episode air date ${input.episodeAirDateKey} (${EPISODE_SYNC_TIME_ZONE}).`,
      reasonCode: "posted_date_mismatch",
    };
  }
  return {
    eligible: true,
    reason: "Eligible for auto-sync.",
    reasonCode: "auto_saved_success",
  };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const requestStartedAt = Date.now();
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };

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
    const syncRequested = parseBoolean(request.nextUrl.searchParams.get("sync"));
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
      const seasons = await getSeasonsByShowId(showId, {
        limit: 100,
        offset: 0,
        includeEpisodeSignal: true,
      });
      resolvedSeason =
        seasons.find((season) => season.has_scheduled_or_aired_episode === true) ??
        seasons[0] ??
        null;
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

    const episodeAirDateByNumber = new Map<number, string>();
    if (syncRequested) {
      const episodes = await getEpisodesBySeasonId(resolvedSeason.id, { limit: 500, offset: 0 });
      for (const episode of episodes) {
        if (!Number.isFinite(episode.episode_number)) continue;
        const airDateKey = normalizeAirDateKey(episode.air_date);
        if (!airDateKey) continue;
        if (!episodeAirDateByNumber.has(episode.episode_number)) {
          episodeAirDateByNumber.set(episode.episode_number, airDateKey);
        }
      }
    }

    const syncAutoSavedPostIds: string[] = [];
    const syncSkippedConflicts: string[] = [];
    const syncCandidateResults: SyncCandidateResult[] = [];
    let syncSkippedIneligibleCount = 0;
    if (syncRequested) {
      for (const candidate of discovery.candidates) {
        const episodeAirDateKey = episodeAirDateByNumber.get(candidate.episode_number) ?? null;
        const evaluation = evaluateEpisodeSyncEligibility({
          author: candidate.author,
          title: candidate.title,
          postedAt: candidate.posted_at,
          episodeAirDateKey,
        });
        if (!evaluation.eligible) {
          syncSkippedIneligibleCount += 1;
          syncCandidateResults.push({
            reddit_post_id: candidate.reddit_post_id,
            status: "not_eligible",
            reason_code: evaluation.reasonCode,
            reason: evaluation.reason,
          });
          continue;
        }
        try {
          await createRedditThread(authContext, {
            communityId,
            trrShowId: community.trr_show_id,
            trrShowName: community.trr_show_name,
            trrSeasonId: resolvedSeason.id,
            redditPostId: candidate.reddit_post_id,
            title: candidate.title,
            url: candidate.url,
            permalink: candidate.permalink,
            author: candidate.author,
            score: candidate.score,
            numComments: candidate.num_comments,
            postedAt: candidate.posted_at,
          });
          syncAutoSavedPostIds.push(candidate.reddit_post_id);
          syncCandidateResults.push({
            reddit_post_id: candidate.reddit_post_id,
            status: "auto_saved",
            reason_code: "auto_saved_success",
            reason: "Auto-synced successfully.",
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "Thread already exists in another community for this show"
          ) {
            syncSkippedConflicts.push(candidate.reddit_post_id);
            syncCandidateResults.push({
              reddit_post_id: candidate.reddit_post_id,
              status: "skipped_conflict",
              reason_code: "already_saved_other_community",
              reason: "Already saved in another community for this show.",
            });
            continue;
          }
          throw error;
        }
      }
    }

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
      sync_requested: syncRequested,
      sync_auto_saved_count: syncAutoSavedPostIds.length,
      sync_skipped_conflicts_count: syncSkippedConflicts.length,
      sync_skipped_ineligible_count: syncSkippedIneligibleCount,
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
        sync_requested: syncRequested,
        sync_auto_saved_count: syncAutoSavedPostIds.length,
        sync_auto_saved_post_ids: syncAutoSavedPostIds,
        sync_skipped_conflicts: syncSkippedConflicts,
        sync_skipped_ineligible_count: syncSkippedIneligibleCount,
        sync_candidate_results: syncCandidateResults,
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
