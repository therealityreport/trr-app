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

interface NormalizedEpisodeSaveThread {
  reddit_post_id: string;
  title: string;
  url: string;
  permalink: string | null;
  author: string | null;
  score: number;
  num_comments: number;
  posted_at: string | null;
}

const MAX_SAVE_THREADS = 250;
const SAVE_CONCURRENCY = 5;

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
  return Math.max(0, Math.floor(value));
};

const normalizeIsoDateTime = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("thread posted_at must be a valid ISO datetime string");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("thread posted_at must be a valid ISO datetime string");
  }
  return parsed.toISOString();
};

const normalizePostIdKey = (value: string): string => value.trim().toLowerCase();

const runWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const consume = async (): Promise<void> => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) {
        return;
      }
      const item = items[currentIndex];
      if (item === undefined) {
        continue;
      }
      results[currentIndex] = await worker(item);
    }
  };

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => consume()));
  return results;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = (await request.json()) as {
      show_id?: unknown;
      show_name?: unknown;
      season_id?: unknown;
      threads?: unknown;
    };

    const legacyShowId = body.show_id;
    const legacyShowName = body.show_name;
    if (legacyShowId !== undefined || legacyShowName !== undefined) {
      return NextResponse.json(
        {
          error:
            "Legacy body params show_id/show_name are no longer supported. Use communityId and optional season_id.",
        },
        { status: 400 },
      );
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
    if (threadInputs.length > MAX_SAVE_THREADS) {
      return NextResponse.json(
        { error: `threads must contain at most ${MAX_SAVE_THREADS} items` },
        { status: 400 },
      );
    }

    const community = await getRedditCommunityById(communityId);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
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

    const dedupedThreadMap = new Map<string, EpisodeSaveThreadInput>();
    const skippedDuplicates: string[] = [];
    for (const thread of threadInputs) {
      if (!thread || typeof thread !== "object") {
        return NextResponse.json({ error: "threads must contain objects" }, { status: 400 });
      }
      if (typeof thread.reddit_post_id !== "string" || !thread.reddit_post_id.trim()) {
        return NextResponse.json({ error: "thread reddit_post_id is required" }, { status: 400 });
      }
      const normalizedPostId = thread.reddit_post_id.trim();
      const key = normalizePostIdKey(normalizedPostId);
      if (dedupedThreadMap.has(key)) {
        skippedDuplicates.push(normalizedPostId);
        continue;
      }
      dedupedThreadMap.set(key, thread);
    }

    const normalizedThreads: NormalizedEpisodeSaveThread[] = [];
    for (const thread of dedupedThreadMap.values()) {
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
      let normalizedPostedAt: string | null = null;
      try {
        normalizedUrl = normalizeUrl(thread.url);
        normalizedPermalink =
          typeof thread.permalink === "string" ? normalizePermalink(thread.permalink) : null;
        normalizedPostedAt = normalizeIsoDateTime(thread.posted_at);
      } catch {
        return NextResponse.json(
          {
            error:
              "thread url/permalink must be valid Reddit URLs and posted_at must be a valid ISO datetime string",
          },
          { status: 400 },
        );
      }
      normalizedThreads.push({
        reddit_post_id: thread.reddit_post_id.trim(),
        title: thread.title.trim(),
        url: normalizedUrl,
        permalink: normalizedPermalink,
        author: typeof thread.author === "string" ? thread.author.trim() || null : null,
        score: toSafeNumber(thread.score),
        num_comments: toSafeNumber(thread.num_comments),
        posted_at: normalizedPostedAt,
      });
    }

    const savedThreads = [] as string[];
    const skippedConflicts = [] as string[];
    await runWithConcurrency(normalizedThreads, SAVE_CONCURRENCY, async (thread) => {
      try {
        await createRedditThread(authContext, {
          communityId,
          trrShowId: community.trr_show_id,
          trrShowName: community.trr_show_name,
          trrSeasonId: typeof seasonId === "string" ? seasonId : null,
          redditPostId: thread.reddit_post_id,
          title: thread.title,
          url: thread.url,
          permalink: thread.permalink,
          author: thread.author,
          score: thread.score,
          numComments: thread.num_comments,
          postedAt: thread.posted_at,
        });
        savedThreads.push(thread.reddit_post_id);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Thread already exists in another community for this show"
        ) {
          skippedConflicts.push(thread.reddit_post_id);
          return;
        }
        throw error;
      }
    });

    console.info("[reddit_episode_save_complete]", {
      community_id: communityId,
      trr_show_id: community.trr_show_id,
      season_id: typeof seasonId === "string" ? seasonId : null,
      requested_threads: threadInputs.length,
      deduped_threads: normalizedThreads.length,
      saved_count: savedThreads.length,
      skipped_conflicts: skippedConflicts.length,
      skipped_duplicates: skippedDuplicates.length,
      duration_ms: Date.now() - requestStartedAt,
    });

    return NextResponse.json({
      success: true,
      saved_count: savedThreads.length,
      skipped_conflicts: skippedConflicts,
      skipped_duplicates: skippedDuplicates,
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
