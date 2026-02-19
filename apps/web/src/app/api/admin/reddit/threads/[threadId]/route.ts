import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  deleteRedditThread,
  getRedditCommunityById,
  getRedditThreadById,
  updateRedditThread,
} from "@/lib/server/admin/reddit-sources-repository";
import { getSeasonById } from "@/lib/server/trr-api/trr-shows-repository";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ threadId: string }>;
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

const toValidRedditUrl = (value: string): string => {
  const parsed = new URL(value);
  if (!isRedditHost(parsed.hostname)) {
    throw new Error("url must be a valid Reddit URL");
  }
  return parsed.toString();
};

const normalizePermalink = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return toValidRedditUrl(value);
  return value.startsWith("/") ? `https://www.reddit.com${value}` : `https://www.reddit.com/${value}`;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { threadId } = await params;
    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }
    if (!isValidUuid(threadId)) {
      return NextResponse.json({ error: "threadId must be a valid UUID" }, { status: 400 });
    }

    const thread = await getRedditThreadById(threadId);
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("[api] Failed to get reddit thread", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };

    const { threadId } = await params;
    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }
    if (!isValidUuid(threadId)) {
      return NextResponse.json({ error: "threadId must be a valid UUID" }, { status: 400 });
    }

    const body = (await request.json()) as {
      community_id?: unknown;
      trr_season_id?: unknown;
      title?: unknown;
      url?: unknown;
      permalink?: unknown;
      author?: unknown;
      score?: unknown;
      num_comments?: unknown;
      posted_at?: unknown;
      notes?: unknown;
    };

    if (body.community_id !== undefined && typeof body.community_id !== "string") {
      return NextResponse.json({ error: "community_id must be a valid UUID" }, { status: 400 });
    }
    if (typeof body.community_id === "string" && !isValidUuid(body.community_id)) {
      return NextResponse.json({ error: "community_id must be a valid UUID" }, { status: 400 });
    }
    if (
      body.trr_season_id !== undefined &&
      body.trr_season_id !== null &&
      (typeof body.trr_season_id !== "string" || !isValidUuid(body.trr_season_id))
    ) {
      return NextResponse.json({ error: "trr_season_id must be a valid UUID" }, { status: 400 });
    }
    if (body.url !== undefined && typeof body.url !== "string") {
      return NextResponse.json({ error: "url must be a string" }, { status: 400 });
    }
    if (typeof body.url === "string") {
      try {
        toValidRedditUrl(body.url);
      } catch {
        return NextResponse.json({ error: "url must be a valid Reddit URL" }, { status: 400 });
      }
    }

    let normalizedPermalink: string | null | undefined;
    if (body.permalink === null) {
      normalizedPermalink = null;
    } else if (typeof body.permalink === "string") {
      try {
        normalizedPermalink = normalizePermalink(body.permalink);
      } catch {
        return NextResponse.json({ error: "permalink must be a valid Reddit URL" }, { status: 400 });
      }
    }

    const existingThread = await getRedditThreadById(threadId);
    if (!existingThread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Enforce show consistency: if reassigning community, verify it belongs to the same show.
    const newCommunityId = typeof body.community_id === "string" ? body.community_id : undefined;
    let syncedShowId: string | undefined;
    let syncedShowName: string | undefined;
    if (newCommunityId) {
      const targetCommunity = await getRedditCommunityById(newCommunityId);
      if (!targetCommunity) {
        return NextResponse.json({ error: "Target community not found" }, { status: 404 });
      }
      if (targetCommunity.trr_show_id !== existingThread.trr_show_id) {
        return NextResponse.json(
          { error: "Cannot reassign thread to a community belonging to a different show" },
          { status: 400 },
        );
      }
      syncedShowId = targetCommunity.trr_show_id;
      syncedShowName = targetCommunity.trr_show_name;
    }
    const nextSeasonId = body.trr_season_id === null
      ? null
      : typeof body.trr_season_id === "string"
        ? body.trr_season_id
        : undefined;
    if (typeof nextSeasonId === "string") {
      const season = await getSeasonById(nextSeasonId);
      const nextShowId = syncedShowId ?? existingThread.trr_show_id;
      if (!season || season.show_id !== nextShowId) {
        return NextResponse.json(
          { error: "trr_season_id must belong to the thread show" },
          { status: 400 },
        );
      }
    }

    const thread = await updateRedditThread(authContext, threadId, {
      communityId: newCommunityId,
      trrShowId: syncedShowId,
      trrShowName: syncedShowName,
      trrSeasonId: nextSeasonId,
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      url: typeof body.url === "string" ? toValidRedditUrl(body.url) : undefined,
      permalink: normalizedPermalink,
      author:
        body.author === null ? null : typeof body.author === "string" ? body.author.trim() : undefined,
      score: typeof body.score === "number" ? body.score : undefined,
      numComments: typeof body.num_comments === "number" ? body.num_comments : undefined,
      postedAt:
        body.posted_at === null
          ? null
          : typeof body.posted_at === "string"
            ? body.posted_at
            : undefined,
      notes: body.notes === null ? null : typeof body.notes === "string" ? body.notes.trim() : undefined,
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("[api] Failed to update reddit thread", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };

    const { threadId } = await params;
    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }
    if (!isValidUuid(threadId)) {
      return NextResponse.json({ error: "threadId must be a valid UUID" }, { status: 400 });
    }

    const deleted = await deleteRedditThread(authContext, threadId);
    if (!deleted) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to delete reddit thread", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
