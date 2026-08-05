import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import {
  loadSharedAccountSourcesFromBackend,
  normalizeSharedAccountSourceScope,
  parseSharedAccountSourcePlatforms,
  updateSharedAccountSourcesInBackend,
} from "@/lib/server/admin/shared-account-sources";
import {
  buildAdminProxyErrorResponse,
} from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const adminContext = toVerifiedAdminContext(await requireAdmin(request));
    const data = await loadSharedAccountSourcesFromBackend(adminContext, {
      sourceScope: normalizeSharedAccountSourceScope(
        request.nextUrl.searchParams.get("source_scope"),
      ),
      includeInactive: request.nextUrl.searchParams.get("include_inactive") !== "false",
      platforms: parseSharedAccountSourcePlatforms(
        request.nextUrl.searchParams.get("platforms"),
      ),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to fetch shared social account sources", error);
    return buildAdminProxyErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminContext = toVerifiedAdminContext(await requireAdmin(request));
    const body = await request.text();
    const data = await updateSharedAccountSourcesInBackend(adminContext, body);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to update shared social account sources", error);
    return buildAdminProxyErrorResponse(error);
  }
}
