import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  createRedditCommunity,
  isValidSubreddit,
  listRedditCommunitiesWithThreads,
  normalizeSubreddit,
} from "@/lib/server/admin/reddit-sources-repository";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

const parseBoolean = (value: string | null, fallback: boolean): boolean => {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return fallback;
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const trrShowId = request.nextUrl.searchParams.get("trr_show_id") ?? undefined;
    const trrSeasonId = request.nextUrl.searchParams.get("trr_season_id");
    if (trrShowId && !isValidUuid(trrShowId)) {
      return NextResponse.json({ error: "trr_show_id must be a valid UUID" }, { status: 400 });
    }
    if (trrSeasonId && !isValidUuid(trrSeasonId)) {
      return NextResponse.json({ error: "trr_season_id must be a valid UUID" }, { status: 400 });
    }
    const includeInactive = parseBoolean(
      request.nextUrl.searchParams.get("include_inactive"),
      false,
    );
    const includeGlobalThreadsForSeason = parseBoolean(
      request.nextUrl.searchParams.get("include_global_threads_for_season"),
      true,
    );

    const communities = await listRedditCommunitiesWithThreads({
      trrShowId,
      trrSeasonId: trrSeasonId ?? null,
      includeInactive,
      includeGlobalThreadsForSeason,
    });

    return NextResponse.json({ communities });
  } catch (error) {
    console.error("[api] Failed to list reddit communities", error);
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
      trr_show_id?: unknown;
      trr_show_name?: unknown;
      subreddit?: unknown;
      display_name?: unknown;
      notes?: unknown;
      is_active?: unknown;
    };

    if (!body.trr_show_id || typeof body.trr_show_id !== "string") {
      return NextResponse.json(
        { error: "trr_show_id is required and must be a string" },
        { status: 400 },
      );
    }
    if (!isValidUuid(body.trr_show_id)) {
      return NextResponse.json(
        { error: "trr_show_id must be a valid UUID" },
        { status: 400 },
      );
    }
    if (!body.trr_show_name || typeof body.trr_show_name !== "string") {
      return NextResponse.json(
        { error: "trr_show_name is required and must be a string" },
        { status: 400 },
      );
    }
    if (!body.subreddit || typeof body.subreddit !== "string") {
      return NextResponse.json(
        { error: "subreddit is required and must be a string" },
        { status: 400 },
      );
    }

    const subreddit = normalizeSubreddit(body.subreddit);
    if (!subreddit || !isValidSubreddit(subreddit)) {
      return NextResponse.json(
        { error: "subreddit must be a valid subreddit name (2-21 letters, numbers, underscore)" },
        { status: 400 },
      );
    }

    const community = await createRedditCommunity(authContext, {
      trrShowId: body.trr_show_id,
      trrShowName: body.trr_show_name.trim(),
      subreddit,
      displayName:
        typeof body.display_name === "string" ? body.display_name.trim() || null : null,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
      isActive: typeof body.is_active === "boolean" ? body.is_active : true,
    });

    return NextResponse.json({ community }, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to create reddit community", error);
    if ((error as { code?: string } | null)?.code === "23505") {
      return NextResponse.json(
        { error: "Community already exists for this show" },
        { status: 409 },
      );
    }
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
