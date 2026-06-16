import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  loadSharedAccountSourcesFromLocalDb,
  normalizeSharedAccountSourceScope,
  parseSharedAccountSourcePlatforms,
} from "@/lib/server/admin/shared-account-sources";
import {
  fetchSocialBackendJson,
  SocialProxyError,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

const readErrorCode = (error: unknown): string | null => {
  if (error instanceof SocialProxyError) return error.code;
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && code.trim() ? code.trim() : null;
};

const readErrorMessage = (error: unknown): string | null =>
  error instanceof Error && error.message.trim() ? error.message.trim() : null;

const buildSharedSourcesBackendEndpoint = (queryString: string): string =>
  queryString.trim() ? `/shared/sources?${queryString.trim()}` : "/shared/sources";

export async function GET(request: NextRequest) {
  const queryString = request.nextUrl.searchParams.toString();
  const backendEndpoint = buildSharedSourcesBackendEndpoint(queryString);
  try {
    await requireAdmin(request);
    const data = await fetchSocialBackendJson("/shared/sources", {
      queryString,
      fallbackError: "Failed to fetch shared social account sources",
      retries: 0,
      timeoutMs: 30_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    const sourceScope = normalizeSharedAccountSourceScope(
      request.nextUrl.searchParams.get("source_scope"),
    );
    try {
      const sources = await loadSharedAccountSourcesFromLocalDb({
        sourceScope,
        includeInactive: request.nextUrl.searchParams.get("include_inactive") !== "false",
        platforms: parseSharedAccountSourcePlatforms(
          request.nextUrl.searchParams.get("platforms"),
        ),
      });
      console.warn("[api] Failed to fetch backend shared social account sources; using local fallback", error);
      return NextResponse.json(
        {
          source_scope: sourceScope,
          sources,
          using_local_fallback: true,
          load_source: "local_db_fallback",
          backend_endpoint: backendEndpoint,
          warning: "TRR-Backend shared-source API is unavailable; showing saved Supabase rows.",
          backend_error_code: readErrorCode(error),
          backend_error_message: readErrorMessage(error),
        },
        {
          headers: {
            "x-trr-cacheable": "0",
            "x-trr-shared-sources-fallback": "local-db",
          },
        },
      );
    } catch (fallbackError) {
      console.error("[api] Failed to load local shared social account sources fallback", fallbackError);
      return socialProxyErrorResponse(error, "[api] Failed to fetch shared social account sources");
    }
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.text();
    const data = await fetchSocialBackendJson("/shared/sources", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
      fallbackError: "Failed to update shared social account sources",
      retries: 0,
      timeoutMs: 45_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to update shared social account sources");
  }
}
