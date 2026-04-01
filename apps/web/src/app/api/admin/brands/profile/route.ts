import { NextRequest, NextResponse } from "next/server";
import { getBrandProfileBySlug, getBrandProfileSuggestions } from "@/lib/server/admin/brand-profile-repository";
import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import { requireAdmin } from "@/lib/server/auth";
import {
  BRANDS_PROFILE_CACHE_NAMESPACE,
  BRANDS_PROFILE_CACHE_TTL_MS,
} from "@/lib/server/trr-api/brands-route-cache";
import { buildAdminReadResponseHeaders } from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const startedAt = performance.now();
    const user = await requireAdmin(request);

    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");

    const slug = searchParams.get("slug")?.trim() ?? "";
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const cacheKey = buildUserScopedRouteCacheKey(user.uid, slug, searchParams);
    const promiseKey = forceRefresh ? `${cacheKey}:refresh` : cacheKey;
    if (!forceRefresh) {
      const cached = getRouteResponseCache<Record<string, unknown>>(
        BRANDS_PROFILE_CACHE_NAMESPACE,
        cacheKey,
      );
      if (cached) {
        return NextResponse.json(cached, {
          headers: buildAdminReadResponseHeaders({ cacheStatus: "hit" }),
        });
      }
    }

    const payload = await getOrCreateRouteResponsePromise(
      BRANDS_PROFILE_CACHE_NAMESPACE,
      promiseKey,
      async () => {
        const loaded = await getBrandProfileBySlug(slug);
        if (!loaded) {
          return null;
        }
        setRouteResponseCache(
          BRANDS_PROFILE_CACHE_NAMESPACE,
          cacheKey,
          loaded,
          BRANDS_PROFILE_CACHE_TTL_MS,
        );
        return loaded;
      },
    );
    if (!payload) {
      const suggestions = await getBrandProfileSuggestions(slug);
      return NextResponse.json(
        { error: "not_found", suggestions },
        {
          status: 404,
          headers: buildAdminReadResponseHeaders({
            cacheStatus: forceRefresh ? "refresh" : "miss",
            upstreamMs: performance.now() - startedAt,
            totalMs: performance.now() - startedAt,
          }),
        },
      );
    }

    const totalMs = performance.now() - startedAt;
    return NextResponse.json(payload, {
      headers: buildAdminReadResponseHeaders({
        cacheStatus: forceRefresh ? "refresh" : "miss",
        upstreamMs: totalMs,
        totalMs,
      }),
    });
  } catch (error) {
    console.error("[api] Failed to load brand profile", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
