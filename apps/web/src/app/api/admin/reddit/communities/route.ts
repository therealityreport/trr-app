import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import {
  createRedditCommunity,
  isValidSubreddit,
  listRedditCommunities,
  listRedditCommunitiesWithThreads,
  normalizeSubreddit,
} from "@/lib/server/admin/reddit-sources-repository";
import {
  buildUserScopedRouteCacheKey,
  getCachedStableRead,
  REDDIT_STABLE_LIST_CACHE_NAMESPACE,
  REDDIT_STABLE_LIST_CACHE_TTL_MS,
} from "@/lib/server/trr-api/reddit-stable-route-cache";
import { loadStableRedditRead } from "@/lib/server/trr-api/reddit-stable-read";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

const normalizeCommunities = (
  communities: Array<Record<string, unknown>>,
  includeAssignedThreads: boolean,
): Array<Record<string, unknown>> => {
  return communities.map((community) => {
    if (includeAssignedThreads) return community;
    return {
      ...community,
      assigned_thread_count: 0,
      assigned_threads: [],
    };
  });
};

const parseBoolean = (value: string | null, fallback: boolean): boolean => {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return fallback;
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");

    const trrShowId = searchParams.get("trr_show_id") ?? undefined;
    const trrSeasonId = searchParams.get("trr_season_id");
    if (trrShowId && !isValidUuid(trrShowId)) {
      return NextResponse.json({ error: "trr_show_id must be a valid UUID" }, { status: 400 });
    }
    if (trrSeasonId && !isValidUuid(trrSeasonId)) {
      return NextResponse.json({ error: "trr_season_id must be a valid UUID" }, { status: 400 });
    }
    const includeInactive = parseBoolean(searchParams.get("include_inactive"), false);
    const includeGlobalThreadsForSeason = parseBoolean(
      searchParams.get("include_global_threads_for_season"),
      true,
    );
    const includeAssignedThreads = parseBoolean(searchParams.get("include_assigned_threads"), false);

    const cacheKey = buildUserScopedRouteCacheKey(user.uid, "reddit-communities", searchParams);
    const { payload, cacheHit } = await getCachedStableRead({
      namespace: REDDIT_STABLE_LIST_CACHE_NAMESPACE,
      cacheKey,
      promiseKey: forceRefresh ? `${cacheKey}:refresh` : cacheKey,
      ttlMs: REDDIT_STABLE_LIST_CACHE_TTL_MS,
      forceRefresh,
      loader: async () => {
        const query = new URLSearchParams();
        if (trrShowId) query.set("trr_show_id", trrShowId);
        if (trrSeasonId) query.set("trr_season_id", trrSeasonId);
        query.set("include_inactive", includeInactive ? "true" : "false");
        query.set(
          "include_global_threads_for_season",
          includeGlobalThreadsForSeason ? "true" : "false",
        );
        query.set("include_assigned_threads", includeAssignedThreads ? "true" : "false");

        const resolved = await loadStableRedditRead<{ communities?: Array<Record<string, unknown>> }>({
          backendPath: "/admin/reddit/communities",
          routeName: "reddit-communities:list",
          queryString: query.toString(),
          fallback: async () => {
            const communities = includeAssignedThreads
              ? await listRedditCommunitiesWithThreads({
                  trrShowId,
                  trrSeasonId: trrSeasonId ?? null,
                  includeInactive,
                  includeGlobalThreadsForSeason,
                })
              : (
                  await listRedditCommunities({
                    trrShowId,
                    includeInactive,
                  })
                ).map((community) => ({
                  ...community,
                  assigned_thread_count: 0,
                  assigned_threads: [],
                }));
            return { communities };
          },
        });

        const communities = Array.isArray(resolved.payload.communities)
          ? resolved.payload.communities
          : [];
        return { communities: normalizeCommunities(communities, includeAssignedThreads) };
      },
    });

    return NextResponse.json(payload, cacheHit ? { headers: { "x-trr-cache": "hit" } } : undefined);
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
      is_show_focused?: unknown;
      network_focus_targets?: unknown;
      franchise_focus_targets?: unknown;
      episode_title_patterns?: unknown;
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

    let networkFocusTargets: string[] | undefined;
    if (body.network_focus_targets !== undefined) {
      if (!Array.isArray(body.network_focus_targets) || body.network_focus_targets.some((value) => typeof value !== "string")) {
        return NextResponse.json(
          { error: "network_focus_targets must be an array of strings" },
          { status: 400 },
        );
      }
      networkFocusTargets = body.network_focus_targets as string[];
    }

    let franchiseFocusTargets: string[] | undefined;
    if (body.franchise_focus_targets !== undefined) {
      if (
        !Array.isArray(body.franchise_focus_targets) ||
        body.franchise_focus_targets.some((value) => typeof value !== "string")
      ) {
        return NextResponse.json(
          { error: "franchise_focus_targets must be an array of strings" },
          { status: 400 },
        );
      }
      franchiseFocusTargets = body.franchise_focus_targets as string[];
    }

    let episodeTitlePatterns: string[] | undefined;
    if (body.episode_title_patterns !== undefined) {
      if (
        !Array.isArray(body.episode_title_patterns) ||
        body.episode_title_patterns.some((value) => typeof value !== "string")
      ) {
        return NextResponse.json(
          { error: "episode_title_patterns must be an array of strings" },
          { status: 400 },
        );
      }
      episodeTitlePatterns = body.episode_title_patterns as string[];
    }
    if ("episode_required_flairs" in body) {
      return NextResponse.json(
        { error: "episode_required_flairs is no longer supported; use analysis_all_flairs" },
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
      isShowFocused: typeof body.is_show_focused === "boolean" ? body.is_show_focused : undefined,
      networkFocusTargets,
      franchiseFocusTargets,
      episodeTitlePatterns,
    });
    invalidateRouteResponseCache("admin-reddit-stable-list", `${user.uid}:`);
    invalidateRouteResponseCache("admin-reddit-stable-detail", `${user.uid}:`);
    invalidateRouteResponseCache("admin-reddit-stable-summary", `${user.uid}:`);

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
