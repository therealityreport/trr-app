import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  deleteRedditCommunity,
  getRedditCommunityById,
  isValidSubreddit,
  normalizeSubreddit,
  updateRedditCommunity,
} from "@/lib/server/admin/reddit-sources-repository";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

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
    return NextResponse.json({ community });
  } catch (error) {
    console.error("[api] Failed to fetch reddit community", error);
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

    const { communityId } = await params;
    if (!communityId) {
      return NextResponse.json({ error: "communityId is required" }, { status: 400 });
    }
    if (!isValidUuid(communityId)) {
      return NextResponse.json({ error: "communityId must be a valid UUID" }, { status: 400 });
    }

    const body = (await request.json()) as {
      subreddit?: unknown;
      display_name?: unknown;
      notes?: unknown;
      is_active?: unknown;
      analysis_flares?: unknown;
      analysis_all_flares?: unknown;
      is_show_focused?: unknown;
      network_focus_targets?: unknown;
      franchise_focus_targets?: unknown;
      episode_title_patterns?: unknown;
    };

    let analysisFlares: string[] | undefined;
    if (body.analysis_flares !== undefined) {
      if (!Array.isArray(body.analysis_flares)) {
        return NextResponse.json({ error: "analysis_flares must be an array of strings" }, { status: 400 });
      }
      const hasInvalidValue = body.analysis_flares.some((value) => typeof value !== "string");
      if (hasInvalidValue) {
        return NextResponse.json({ error: "analysis_flares must be an array of strings" }, { status: 400 });
      }
      analysisFlares = body.analysis_flares as string[];
    }

    let analysisAllFlares: string[] | undefined;
    if (body.analysis_all_flares !== undefined) {
      if (!Array.isArray(body.analysis_all_flares)) {
        return NextResponse.json({ error: "analysis_all_flares must be an array of strings" }, { status: 400 });
      }
      const hasInvalidValue = body.analysis_all_flares.some((value) => typeof value !== "string");
      if (hasInvalidValue) {
        return NextResponse.json({ error: "analysis_all_flares must be an array of strings" }, { status: 400 });
      }
      analysisAllFlares = body.analysis_all_flares as string[];
    }

    let networkFocusTargets: string[] | undefined;
    if (body.network_focus_targets !== undefined) {
      if (!Array.isArray(body.network_focus_targets)) {
        return NextResponse.json({ error: "network_focus_targets must be an array of strings" }, { status: 400 });
      }
      const hasInvalidValue = body.network_focus_targets.some((value) => typeof value !== "string");
      if (hasInvalidValue) {
        return NextResponse.json({ error: "network_focus_targets must be an array of strings" }, { status: 400 });
      }
      networkFocusTargets = body.network_focus_targets as string[];
    }

    let franchiseFocusTargets: string[] | undefined;
    if (body.franchise_focus_targets !== undefined) {
      if (!Array.isArray(body.franchise_focus_targets)) {
        return NextResponse.json({ error: "franchise_focus_targets must be an array of strings" }, { status: 400 });
      }
      const hasInvalidValue = body.franchise_focus_targets.some((value) => typeof value !== "string");
      if (hasInvalidValue) {
        return NextResponse.json({ error: "franchise_focus_targets must be an array of strings" }, { status: 400 });
      }
      franchiseFocusTargets = body.franchise_focus_targets as string[];
    }

    let episodeTitlePatterns: string[] | undefined;
    if (body.episode_title_patterns !== undefined) {
      if (!Array.isArray(body.episode_title_patterns)) {
        return NextResponse.json({ error: "episode_title_patterns must be an array of strings" }, { status: 400 });
      }
      const hasInvalidValue = body.episode_title_patterns.some((value) => typeof value !== "string");
      if (hasInvalidValue) {
        return NextResponse.json({ error: "episode_title_patterns must be an array of strings" }, { status: 400 });
      }
      episodeTitlePatterns = body.episode_title_patterns as string[];
    }
    if ("episode_required_flares" in body) {
      return NextResponse.json(
        { error: "episode_required_flares is no longer supported; use analysis_all_flares" },
        { status: 400 },
      );
    }

    let subreddit: string | undefined;
    if (body.subreddit !== undefined) {
      if (typeof body.subreddit !== "string") {
        return NextResponse.json({ error: "subreddit must be a string" }, { status: 400 });
      }
      const normalized = normalizeSubreddit(body.subreddit);
      if (!normalized || !isValidSubreddit(normalized)) {
        return NextResponse.json(
          { error: "subreddit must be a valid subreddit name (2-21 letters, numbers, underscore)" },
          { status: 400 },
        );
      }
      subreddit = normalized;
    }

    const community = await updateRedditCommunity(authContext, communityId, {
      subreddit,
      displayName:
        typeof body.display_name === "string" ? body.display_name.trim() || null : undefined,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : undefined,
      isActive: typeof body.is_active === "boolean" ? body.is_active : undefined,
      analysisFlares,
      analysisAllFlares,
      isShowFocused: typeof body.is_show_focused === "boolean" ? body.is_show_focused : undefined,
      networkFocusTargets,
      franchiseFocusTargets,
      episodeTitlePatterns,
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    return NextResponse.json({ community });
  } catch (error) {
    console.error("[api] Failed to update reddit community", error);
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const deleted = await deleteRedditCommunity(authContext, communityId);
    if (!deleted) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to delete reddit community", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
