import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getCastByShowId, getShowById } from "@/lib/server/trr-api/trr-shows-repository";
import {
  type RedditListingSort,
  RedditDiscoveryError,
  discoverSubredditThreads,
} from "@/lib/server/admin/reddit-discovery-service";
import { getRedditCommunityById } from "@/lib/server/admin/reddit-sources-repository";
import { isValidUuid } from "@/lib/server/validation/identifiers";

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
  return values.length > 0 ? values : SORTS;
};

const parseLimit = (value: string | null): number => {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return 35;
  return Math.min(parsed, 80);
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

    const community = await getRedditCommunityById(communityId);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const show = await getShowById(community.trr_show_id).catch(() => null);
    const cast = await getCastByShowId(community.trr_show_id, { limit: 200 }).catch(() => []);
    const castNames = cast
      .map((member) => member.full_name ?? member.cast_member_name ?? "")
      .filter((name): name is string => name.trim().length > 0);
    const sortModes = parseSortModes(request.nextUrl.searchParams.get("sort"));
    const limitPerMode = parseLimit(request.nextUrl.searchParams.get("limit"));

    const discovery = await discoverSubredditThreads({
      subreddit: community.subreddit,
      showName: show?.name ?? community.trr_show_name,
      showAliases: show?.alternative_names ?? [],
      castNames,
      analysisFlares: community.analysis_flares ?? [],
      analysisAllFlares: community.analysis_all_flares ?? [],
      sortModes,
      limitPerMode,
    });

    return NextResponse.json({
      community,
      discovery,
    });
  } catch (error) {
    console.error("[api] Failed to discover reddit threads", error);
    if (error instanceof RedditDiscoveryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
