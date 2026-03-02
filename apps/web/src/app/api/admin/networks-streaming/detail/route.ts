import { NextRequest, NextResponse } from "next/server";
import { parseEntityType } from "@/lib/admin/networks-streaming-entity";
import { requireAdmin } from "@/lib/server/auth";
import {
  getNetworkStreamingDetail,
  getNetworkStreamingSuggestions,
} from "@/lib/server/admin/networks-streaming-repository";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

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

    const familyContext = {
      family: null as unknown,
      family_suggestions: [] as unknown[],
      shared_links: [] as unknown[],
      wikipedia_show_urls: [] as unknown[],
    };
    const backendUrl = getBackendApiUrl("/admin/brands/families/by-entity");
    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (backendUrl && serviceRoleKey) {
      try {
        const upstream = new URL(backendUrl);
        upstream.searchParams.set("entity_type", detail.entity_type);
        upstream.searchParams.set("entity_key", detail.entity_key);
        const response = await fetch(upstream.toString(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          cache: "no-store",
        });
        if (response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            family?: unknown;
            family_suggestions?: unknown[];
            shared_links?: unknown[];
            wikipedia_show_urls?: unknown[];
          };
          familyContext.family = payload.family ?? null;
          familyContext.family_suggestions = Array.isArray(payload.family_suggestions) ? payload.family_suggestions : [];
          familyContext.shared_links = Array.isArray(payload.shared_links) ? payload.shared_links : [];
          familyContext.wikipedia_show_urls = Array.isArray(payload.wikipedia_show_urls) ? payload.wikipedia_show_urls : [];
        }
      } catch (error) {
        console.error("[api] Failed to load streaming detail family enrichment", error);
      }
    }

    return NextResponse.json({
      ...detail,
      family: familyContext.family,
      family_suggestions: familyContext.family_suggestions,
      shared_links: familyContext.shared_links,
      wikipedia_show_urls: familyContext.wikipedia_show_urls,
    });
  } catch (error) {
    console.error("[api] Failed to load networks/streaming detail", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
