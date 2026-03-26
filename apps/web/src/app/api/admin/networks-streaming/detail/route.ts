import { NextRequest, NextResponse } from "next/server";
import { parseEntityType } from "@/lib/admin/networks-streaming-entity";
import { requireAdmin } from "@/lib/server/auth";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const entityType = parseEntityType(request.nextUrl.searchParams.get("entity_type") ?? "");
    const entityKey = request.nextUrl.searchParams.get("entity_key")?.trim() ?? "";
    const entitySlug = request.nextUrl.searchParams.get("entity_slug")?.trim() ?? "";

    if (!entityType) {
      return NextResponse.json({ error: "entity_type must be network, streaming, or production" }, { status: 400 });
    }
    if (!entityKey && !entitySlug) {
      return NextResponse.json({ error: "entity_key or entity_slug is required" }, { status: 400 });
    }

    const query = new URLSearchParams({ entity_type: entityType });
    if (entityKey) query.set("entity_key", entityKey);
    if (entitySlug) query.set("entity_slug", entitySlug);

    const upstream = await fetchAdminBackendJson(
      `/admin/shows/networks-streaming/detail?${query.toString()}`,
      {
        timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
        routeName: "networks-streaming-detail",
      },
    );

    if (upstream.status === 404) {
      return NextResponse.json(upstream.data, { status: 404 });
    }
    if (upstream.status !== 200) {
      throw new Error(
        typeof upstream.data.error === "string"
          ? upstream.data.error
          : typeof upstream.data.detail === "string"
            ? upstream.data.detail
            : "Failed to load networks/streaming detail",
      );
    }

    return NextResponse.json(upstream.data);
  } catch (error) {
    console.error("[api] Failed to load networks/streaming detail", error);
    return buildAdminProxyErrorResponse(error);
  }
}
