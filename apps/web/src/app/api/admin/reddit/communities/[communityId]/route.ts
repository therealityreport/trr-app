import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import {
  deleteRedditCommunity,
  getRedditCommunityById,
  isValidSubreddit,
  normalizeSubreddit,
  updateRedditCommunity,
} from "@/lib/server/admin/reddit-sources-repository";
import {
  buildUserScopedRouteCacheKey,
  getCachedStableRead,
  REDDIT_STABLE_DETAIL_CACHE_NAMESPACE,
  REDDIT_STABLE_DETAIL_CACHE_TTL_MS,
} from "@/lib/server/trr-api/reddit-stable-route-cache";
import { loadStableRedditRead } from "@/lib/server/trr-api/reddit-stable-read";
import { isValidUuid } from "@/lib/server/validation/identifiers";
import { toCanonicalFlairKey } from "@/lib/reddit/flair-key";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { communityId } = await params;
    if (!communityId) {
      return NextResponse.json({ error: "communityId is required" }, { status: 400 });
    }
    if (!isValidUuid(communityId)) {
      return NextResponse.json({ error: "communityId must be a valid UUID" }, { status: 400 });
    }

    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");

    const cacheKey = buildUserScopedRouteCacheKey(user.uid, `reddit-community:${communityId}`, searchParams);
    const { payload, cacheHit } = await getCachedStableRead({
      namespace: REDDIT_STABLE_DETAIL_CACHE_NAMESPACE,
      cacheKey,
      promiseKey: forceRefresh ? `${cacheKey}:refresh` : cacheKey,
      ttlMs: REDDIT_STABLE_DETAIL_CACHE_TTL_MS,
      forceRefresh,
      loader: async () => {
        const resolved = await loadStableRedditRead<{ community?: Record<string, unknown> | null }>({
          backendPath: `/admin/reddit/communities/${communityId}`,
          routeName: "reddit-communities:detail",
          allowFallbackStatusCodes: [501],
          fallback: async () => ({
            community: (await getRedditCommunityById(communityId)) as Record<string, unknown> | null,
          }),
        });
        return {
          community: resolved.payload.community ?? null,
        };
      },
    });

    if (!payload.community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    return NextResponse.json(payload, cacheHit ? { headers: { "x-trr-cache": "hit" } } : undefined);
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
      analysis_flairs?: unknown;
      analysis_all_flairs?: unknown;
      is_show_focused?: unknown;
      network_focus_targets?: unknown;
      franchise_focus_targets?: unknown;
      episode_title_patterns?: unknown;
      post_flair_categories?: unknown;
      post_flair_assignments?: unknown;
    };

    let analysisFlairs: string[] | undefined;
    if (body.analysis_flairs !== undefined) {
      if (!Array.isArray(body.analysis_flairs)) {
        return NextResponse.json({ error: "analysis_flairs must be an array of strings" }, { status: 400 });
      }
      const hasInvalidValue = body.analysis_flairs.some((value) => typeof value !== "string");
      if (hasInvalidValue) {
        return NextResponse.json({ error: "analysis_flairs must be an array of strings" }, { status: 400 });
      }
      analysisFlairs = body.analysis_flairs as string[];
    }

    let analysisAllFlairs: string[] | undefined;
    if (body.analysis_all_flairs !== undefined) {
      if (!Array.isArray(body.analysis_all_flairs)) {
        return NextResponse.json({ error: "analysis_all_flairs must be an array of strings" }, { status: 400 });
      }
      const hasInvalidValue = body.analysis_all_flairs.some((value) => typeof value !== "string");
      if (hasInvalidValue) {
        return NextResponse.json({ error: "analysis_all_flairs must be an array of strings" }, { status: 400 });
      }
      analysisAllFlairs = body.analysis_all_flairs as string[];
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
    let postFlairCategories: Record<string, string> | undefined;
    if (body.post_flair_categories !== undefined) {
      if (typeof body.post_flair_categories !== "object" || body.post_flair_categories === null || Array.isArray(body.post_flair_categories)) {
        return NextResponse.json({ error: "post_flair_categories must be an object" }, { status: 400 });
      }
      const raw = body.post_flair_categories as Record<string, unknown>;
      const validCategories = new Set(["cast", "season"]);
      const validated: Record<string, string> = {};
      for (const [key, value] of Object.entries(raw)) {
        if (typeof value !== "string" || !validCategories.has(value)) {
          return NextResponse.json(
            { error: `Invalid flair category "${String(value)}" for "${key}". Must be "cast" or "season".` },
            { status: 400 },
          );
        }
        validated[key] = value;
      }
      postFlairCategories = validated;
    }

    let postFlairAssignments:
      | Record<string, { show_ids: string[]; season_ids: string[]; person_ids: string[] }>
      | undefined;
    if (body.post_flair_assignments !== undefined) {
      if (
        typeof body.post_flair_assignments !== "object" ||
        body.post_flair_assignments === null ||
        Array.isArray(body.post_flair_assignments)
      ) {
        return NextResponse.json({ error: "post_flair_assignments must be an object" }, { status: 400 });
      }

      const validateIds = (field: string, value: unknown): string[] | null => {
        if (!Array.isArray(value)) return null;
        const next: string[] = [];
        for (const entry of value) {
          if (typeof entry !== "string") return null;
          const normalized = entry.trim();
          if (!normalized) continue;
          if (!next.includes(normalized)) next.push(normalized);
        }
        return next;
      };

      const validated: Record<string, { show_ids: string[]; season_ids: string[]; person_ids: string[] }> = {};
      for (const [rawKey, rawAssignment] of Object.entries(body.post_flair_assignments as Record<string, unknown>)) {
        if (typeof rawAssignment !== "object" || rawAssignment === null || Array.isArray(rawAssignment)) {
          return NextResponse.json(
            { error: `post_flair_assignments.${rawKey} must be an object` },
            { status: 400 },
          );
        }
        const flairKey = toCanonicalFlairKey(rawKey);
        if (!flairKey) {
          return NextResponse.json(
            { error: `post_flair_assignments contains an invalid flair key "${rawKey}"` },
            { status: 400 },
          );
        }
        const assignment = rawAssignment as Record<string, unknown>;
        const showIds = validateIds("show_ids", assignment.show_ids);
        const seasonIds = validateIds("season_ids", assignment.season_ids);
        const personIds = validateIds("person_ids", assignment.person_ids);
        if (!showIds || !seasonIds || !personIds) {
          return NextResponse.json(
            {
              error:
                `post_flair_assignments.${rawKey} must include string arrays for ` +
                `"show_ids", "season_ids", and "person_ids"`,
            },
            { status: 400 },
          );
        }
        validated[flairKey] = {
          show_ids: showIds,
          season_ids: seasonIds,
          person_ids: personIds,
        };
      }
      postFlairAssignments = validated;
    }

    if ("episode_required_flairs" in body) {
      return NextResponse.json(
        { error: "episode_required_flairs is no longer supported; use analysis_all_flairs" },
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
      analysisFlairs,
      analysisAllFlairs,
      isShowFocused: typeof body.is_show_focused === "boolean" ? body.is_show_focused : undefined,
      networkFocusTargets,
      franchiseFocusTargets,
      episodeTitlePatterns,
      postFlairCategories,
      postFlairAssignments,
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    invalidateRouteResponseCache("admin-reddit-stable-list", `${user.uid}:`);
    invalidateRouteResponseCache("admin-reddit-stable-detail", `${user.uid}:`);
    invalidateRouteResponseCache("admin-reddit-stable-summary", `${user.uid}:`);

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
    invalidateRouteResponseCache("admin-reddit-stable-list", `${user.uid}:`);
    invalidateRouteResponseCache("admin-reddit-stable-detail", `${user.uid}:`);
    invalidateRouteResponseCache("admin-reddit-stable-summary", `${user.uid}:`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to delete reddit community", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
