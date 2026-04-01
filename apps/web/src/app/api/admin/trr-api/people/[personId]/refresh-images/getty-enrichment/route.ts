import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { readGettyPrefetchPayload } from "@/lib/server/admin/getty-local-scrape";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

interface RouteParams {
  params: Promise<{ personId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { personId } = await params;
    if (!personId) {
      return NextResponse.json({ error: "personId is required" }, { status: 400 });
    }

    const rawBody = await request.text().catch(() => "{}");
    const parsed = JSON.parse(rawBody || "{}") as Record<string, unknown>;
    const prefetchToken =
      typeof parsed.getty_prefetch_token === "string" ? parsed.getty_prefetch_token.trim() : "";
    if (!prefetchToken) {
      return NextResponse.json({ error: "getty_prefetch_token is required" }, { status: 400 });
    }

    const stored = await readGettyPrefetchPayload(prefetchToken);
    if (!stored) {
      return NextResponse.json({ error: "Getty prefetch payload expired." }, { status: 410 });
    }

    const backendUrl = getBackendApiUrl(`/admin/person/${personId}/refresh-images/getty-enrichment`);
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }
    const serviceRoleKey = getInternalAdminBearerToken();
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const body = {
      show_id: parsed.show_id,
      show_name: parsed.show_name,
      getty_prefetch_token: prefetchToken,
      getty_prefetch_mode: typeof stored.prefetch_mode === "string" ? stored.prefetch_mode : "full",
      getty_deferred_enrichment: true,
      getty_deferred_editorial_ids: Array.isArray(stored.deferred_editorial_ids)
        ? stored.deferred_editorial_ids
        : [],
      getty_prefetched_assets: Array.isArray(stored.merged) ? stored.merged : [],
      getty_prefetched_events: Array.isArray(stored.merged_events) ? stored.merged_events : [],
      getty_prefetched_queries: Array.isArray(stored.query_summaries) ? stored.query_summaries : [],
      getty_prefetch_auth_mode: typeof stored.auth_mode === "string" ? stored.auth_mode : undefined,
      getty_prefetch_auth_warning:
        typeof stored.auth_warning === "string" ? stored.auth_warning : undefined,
    };

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({ error: "Getty enrichment failed" }))) as Record<
      string,
      unknown
    >;
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
