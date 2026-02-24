import { NextRequest, NextResponse } from "next/server";
import { parseEntityType } from "@/lib/admin/networks-streaming-entity";
import { requireAdmin } from "@/lib/server/auth";
import {
  getNetworkStreamingDetail,
  getNetworkStreamingSuggestions,
} from "@/lib/server/admin/networks-streaming-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const entityType = parseEntityType(request.nextUrl.searchParams.get("entity_type") ?? "");
    const entityKey = request.nextUrl.searchParams.get("entity_key")?.trim() ?? "";
    const entitySlug = request.nextUrl.searchParams.get("entity_slug")?.trim() ?? "";

    if (!entityType) {
      return NextResponse.json({ error: "entity_type must be network or streaming" }, { status: 400 });
    }
    if (!entityKey && !entitySlug) {
      return NextResponse.json({ error: "entity_key or entity_slug is required" }, { status: 400 });
    }

    const detail = await getNetworkStreamingDetail({
      entity_type: entityType,
      entity_key: entityKey || undefined,
      entity_slug: entitySlug || undefined,
      show_scope: "added",
    });

    if (!detail) {
      const suggestions = await getNetworkStreamingSuggestions({
        entity_type: entityType,
        entity_key: entityKey || undefined,
        entity_slug: entitySlug || undefined,
      });
      return NextResponse.json({ error: "not_found", suggestions }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error("[api] Failed to load networks/streaming detail", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
