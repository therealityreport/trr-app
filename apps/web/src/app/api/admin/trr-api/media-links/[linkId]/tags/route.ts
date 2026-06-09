import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import {
  AdminReadProxyError,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ linkId: string }>;
}

const ROUTE_NAME = "media-link-tags:sync";

/**
 * PUT /api/admin/trr-api/media-links/[linkId]/tags
 *
 * Proxy media-link people tag writes to TRR-Backend so app direct SQL keeps
 * shrinking behind FastAPI-owned write contracts.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { linkId } = await params;

    if (!linkId) {
      return NextResponse.json({ error: "linkId is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const upstream = await fetchAdminBackendJson(`/admin/media-links/${linkId}/tags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body && typeof body === "object" ? body : {}),
      adminContext: toVerifiedAdminContext(user),
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: ROUTE_NAME,
      requestRole: "primary",
    });

    if (upstream.status !== 200) {
      throw buildAdminBackendStatusError({
        status: upstream.status,
        data: upstream.data,
        fallbackMessage: "Failed to update media link tags.",
        routeName: ROUTE_NAME,
        requestRole: "primary",
      });
    }

    return NextResponse.json(upstream.data);
  } catch (error) {
    console.error("[api] Failed to update media link tags", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      error instanceof AdminReadProxyError
        ? error.status
        : message === "unauthorized"
          ? 401
          : message === "forbidden"
            ? 403
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
