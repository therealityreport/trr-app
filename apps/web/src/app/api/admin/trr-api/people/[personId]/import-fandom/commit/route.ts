import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import {
  normalizeFandomSyncOptions,
  normalizeFandomSyncPreviewResponse,
} from "@/lib/admin/fandom-sync-types";

export const dynamic = "force-dynamic";

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

    const backendUrl = getBackendApiUrl(`/admin/person/${personId}/import-fandom/commit`);
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }
    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const body = normalizeFandomSyncOptions(await request.json().catch(() => ({})));
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });
    const rawData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const data = normalizeFandomSyncPreviewResponse(rawData);
    if (!response.ok) {
      const error =
        typeof rawData.error === "string"
          ? rawData.error
          : typeof rawData.detail === "string"
            ? rawData.detail
            : "Fandom commit failed";
      return NextResponse.json({ error }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to commit fandom import", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
