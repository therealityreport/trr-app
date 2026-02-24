import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  createRedditThread,
  getRedditCommunityById,
} from "@/lib/server/admin/reddit-sources-repository";
import { getSeasonById } from "@/lib/server/trr-api/trr-shows-repository";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

interface EpisodeSaveThreadInput {
  reddit_post_id?: unknown;
  title?: unknown;
  url?: unknown;
  permalink?: unknown;
  author?: unknown;
  score?: unknown;
  num_comments?: unknown;
  posted_at?: unknown;
}

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

const toSafeNumber = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };

    const { communityId } = await params;
    if (!communityId) {
      return NextResponse.json({ error: "communityId is required" }, { status: 400 });
    }
    if (!isValidUuid(communityId)) {
      return NextResponse.json({ error: "communityId must be a valid UUID" }, { status: 400 });
    }

    const body = (await request.json()) as {
      show_id?: unknown;
      show_name?: unknown;
      season_id?: unknown;
      threads?: unknown;
    };

    const legacyShowId = body.show_id;
    if (legacyShowId !== undefined && legacyShowId !== null) {
      if (typeof legacyShowId !== "string" || !isValidUuid(legacyShowId)) {
        return NextResponse.json({ error: "show_id must be a valid UUID" }, { status: 400 });
      }
      console.warn("[api] Legacy show_id body param used for episode discussion save");
    }
    const legacyShowName = body.show_name;
    if (legacyShowName !== undefined && legacyShowName !== null) {
      if (typeof legacyShowName !== "string") {
        return NextResponse.json(
          { error: "show_name must be a string when provided" },
          { status: 400 },
        );
      }
      console.warn("[api] Legacy show_name body param used for episode discussion save");
    }

    const seasonId = body.season_id;
    if (seasonId !== null && seasonId !== undefined) {
      if (typeof seasonId !== "string" || !isValidUuid(seasonId)) {
        return NextResponse.json({ error: "season_id must be null or a valid UUID" }, { status: 400 });
      }
    }

    if (!Array.isArray(body.threads)) {
      return NextResponse.json({ error: "threads must be an array" }, { status: 400 });
    }

    const threadInputs = body.threads as EpisodeSaveThreadInput[];
    if (threadInputs.length === 0) {
      return NextResponse.json({ error: "threads must include at least one item" }, { status: 400 });
    }

    const community = await getRedditCommunityById(communityId);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    if (typeof legacyShowId === "string" && community.trr_show_id !== legacyShowId) {
      return NextResponse.json(
        { error: "show_id does not match selected community" },
        { status: 400 },
      );
    }

    if (typeof seasonId === "string") {
      const season = await getSeasonById(seasonId);
      if (!season || season.show_id !== community.trr_show_id) {
        return NextResponse.json(
          { error: "season_id must belong to the selected community show" },
          { status: 400 },
        );
      }
    }

    const savedThreads = [] as string[];
    const skippedConflicts = [] as string[];
    for (const thread of threadInputs) {
      if (!thread || typeof thread !== "object") {
        return NextResponse.json({ error: "threads must contain objects" }, { status: 400 });
      }

      if (typeof thread.reddit_post_id !== "string" || !thread.reddit_post_id.trim()) {
        return NextResponse.json({ error: "thread reddit_post_id is required" }, { status: 400 });
      }
      if (typeof thread.title !== "string" || !thread.title.trim()) {
        return NextResponse.json({ error: "thread title is required" }, { status: 400 });
      }
      if (typeof thread.url !== "string" || !thread.url.trim()) {
        return NextResponse.json({ error: "thread url is required" }, { status: 400 });
      }

      let normalizedUrl: string;
      let normalizedPermalink: string | null = null;
      try {
        normalizedUrl = normalizeUrl(thread.url);
        normalizedPermalink =
          typeof thread.permalink === "string" ? normalizePermalink(thread.permalink) : null;
      } catch {
        return NextResponse.json({ error: "thread url/permalink must be valid Reddit URLs" }, { status: 400 });
      }

      try {
        await createRedditThread(authContext, {
          communityId,
          trrShowId: community.trr_show_id,
          trrShowName: community.trr_show_name,
          trrSeasonId: typeof seasonId === "string" ? seasonId : null,
          redditPostId: thread.reddit_post_id.trim(),
          title: thread.title.trim(),
          url: normalizedUrl,
          permalink: normalizedPermalink,
          author: typeof thread.author === "string" ? thread.author.trim() || null : null,
          score: toSafeNumber(thread.score),
          numComments: toSafeNumber(thread.num_comments),
          postedAt: typeof thread.posted_at === "string" ? thread.posted_at : null,
        });
        savedThreads.push(thread.reddit_post_id.trim());
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Thread already exists in another community for this show"
        ) {
          skippedConflicts.push(thread.reddit_post_id.trim());
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      saved_count: savedThreads.length,
      skipped_conflicts: skippedConflicts,
    });
  } catch (error) {
    console.error("[api] Failed to bulk save reddit episode discussions", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized"
      ? 401
      : message === "forbidden"
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
