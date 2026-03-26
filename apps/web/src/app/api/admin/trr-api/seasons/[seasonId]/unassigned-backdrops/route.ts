import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ seasonId: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

 /**
  * GET /api/admin/trr-api/seasons/[seasonId]/unassigned-backdrops
  *
  * Returns TMDb show backdrops that are not yet linked to ANY season for this show as kind=backdrop.
  */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { seasonId } = await params;

    if (!seasonId) {
      return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
    }
    if (!UUID_RE.test(seasonId)) {
      return NextResponse.json({ error: "seasonId must be a UUID" }, { status: 400 });
    }

    const upstream = await fetchAdminBackendJson(
      `/admin/trr-api/seasons/${seasonId}/backdrops/unassigned`,
      {
        timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
        routeName: "season-unassigned-backdrops",
      },
    );
    if (upstream.status !== 200) {
      throw new Error(
        typeof upstream.data.error === "string"
          ? upstream.data.error
          : typeof upstream.data.detail === "string"
            ? upstream.data.detail
            : "Failed to load unassigned backdrops",
      );
    }
    return NextResponse.json(upstream.data);
  } catch (error) {
    console.error("[api] Failed to load unassigned backdrops", error);
    return buildAdminProxyErrorResponse(error);
  }
}
