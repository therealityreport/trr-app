import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  createRedditThread,
  getRedditCommunityById,
  listRedditThreads,
} from "@/lib/server/admin/reddit-sources-repository";
import { getSeasonById } from "@/lib/server/trr-api/trr-shows-repository";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

const parseBoolean = (value: string | null, fallback: boolean): boolean => {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return fallback;
};

const isRedditHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  return (
    host === "reddit.com" ||
    host === "redd.it" ||
    host.endsWith(".reddit.com") ||
    host.endsWith(".redd.it")
  );
};

const normalizeUrl = (value: string): string => {
  const parsed = new URL(value);
  if (!isRedditHost(parsed.hostname)) {
    throw new Error("url must be a valid Reddit URL");
  }
  return parsed.toString();
};

const normalizePermalink = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    return normalizeUrl(value);
  }
  return value.startsWith("/") ? `https://www.reddit.com${value}` : `https://www.reddit.com/${value}`;
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const communityId = request.nextUrl.searchParams.get("community_id") ?? undefined;
    const trrShowId = request.nextUrl.searchParams.get("trr_show_id") ?? undefined;
    const trrSeasonId = request.nextUrl.searchParams.get("trr_season_id");
    if (communityId && !isValidUuid(communityId)) {
      return NextResponse.json({ error: "community_id must be a valid UUID" }, { status: 400 });
    }
    if (trrShowId && !isValidUuid(trrShowId)) {
      return NextResponse.json({ error: "trr_show_id must be a valid UUID" }, { status: 400 });
    }
    if (trrSeasonId && !isValidUuid(trrSeasonId)) {
      return NextResponse.json({ error: "trr_season_id must be a valid UUID" }, { status: 400 });
    }
    const includeGlobalThreadsForSeason = parseBoolean(
      request.nextUrl.searchParams.get("include_global_threads_for_season"),
      true,
    );

    const threads = await listRedditThreads({
      communityId,
      trrShowId,
      trrSeasonId: trrSeasonId ?? null,
      includeGlobalThreadsForSeason,
    });

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("[api] Failed to list reddit threads", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };

    const body = (await request.json()) as {
      community_id?: unknown;
      trr_show_id?: unknown;
      trr_show_name?: unknown;
      trr_season_id?: unknown;
      reddit_post_id?: unknown;
      title?: unknown;
      url?: unknown;
      permalink?: unknown;
      author?: unknown;
      score?: unknown;
      num_comments?: unknown;
      posted_at?: unknown;
      notes?: unknown;
    };

    if (!body.community_id || typeof body.community_id !== "string") {
      return NextResponse.json(
        { error: "community_id is required and must be a string" },
        { status: 400 },
      );
    }
    if (!isValidUuid(body.community_id)) {
      return NextResponse.json({ error: "community_id must be a valid UUID" }, { status: 400 });
    }
    if (!body.trr_show_id || typeof body.trr_show_id !== "string") {
      return NextResponse.json(
        { error: "trr_show_id is required and must be a string" },
        { status: 400 },
      );
    }
    if (!isValidUuid(body.trr_show_id)) {
      return NextResponse.json({ error: "trr_show_id must be a valid UUID" }, { status: 400 });
    }
    if (typeof body.trr_season_id === "string" && !isValidUuid(body.trr_season_id)) {
      return NextResponse.json({ error: "trr_season_id must be a valid UUID" }, { status: 400 });
    }
    if (!body.trr_show_name || typeof body.trr_show_name !== "string") {
      return NextResponse.json(
        { error: "trr_show_name is required and must be a string" },
        { status: 400 },
      );
    }
    if (!body.reddit_post_id || typeof body.reddit_post_id !== "string") {
      return NextResponse.json(
        { error: "reddit_post_id is required and must be a string" },
        { status: 400 },
      );
    }
    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json(
        { error: "title is required and must be a string" },
        { status: 400 },
      );
    }
    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json(
        { error: "url is required and must be a string" },
        { status: 400 },
      );
    }

    try {
      normalizeUrl(body.url);
    } catch {
      return NextResponse.json({ error: "url must be a valid Reddit URL" }, { status: 400 });
    }

    const community = await getRedditCommunityById(body.community_id);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    if (community.trr_show_id !== body.trr_show_id) {
      return NextResponse.json(
        { error: "trr_show_id does not match selected community" },
        { status: 400 },
      );
    }
    if (typeof body.trr_season_id === "string") {
      const season = await getSeasonById(body.trr_season_id);
      if (!season || season.show_id !== community.trr_show_id) {
        return NextResponse.json(
          { error: "trr_season_id must belong to trr_show_id" },
          { status: 400 },
        );
      }
    }

    let normalizedPermalink: string | null = null;
    if (typeof body.permalink === "string") {
      try {
        normalizedPermalink = normalizePermalink(body.permalink);
      } catch {
        return NextResponse.json({ error: "permalink must be a valid Reddit URL" }, { status: 400 });
      }
    }

    const thread = await createRedditThread(authContext, {
      communityId: body.community_id,
      trrShowId: body.trr_show_id,
      trrShowName: community.trr_show_name,
      trrSeasonId: typeof body.trr_season_id === "string" ? body.trr_season_id : null,
      sourceKind: "manual",
      redditPostId: body.reddit_post_id.trim(),
      title: body.title.trim(),
      url: normalizeUrl(body.url),
      permalink: normalizedPermalink,
      author: typeof body.author === "string" ? body.author.trim() || null : null,
      score: typeof body.score === "number" ? body.score : 0,
      numComments: typeof body.num_comments === "number" ? body.num_comments : 0,
      postedAt: typeof body.posted_at === "string" ? body.posted_at : null,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    });

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to create reddit thread", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized"
      ? 401
      : message === "forbidden"
        ? 403
        : message === "Thread already exists in another community for this show"
          ? 409
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
