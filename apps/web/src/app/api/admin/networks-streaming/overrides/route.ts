import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

const getBackendHeaders = (): HeadersInit | null => {
  const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return null;
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
  };
};

const backendError = (response: Response, payload: Record<string, unknown>) => {
  const error =
    typeof payload.error === "string"
      ? payload.error
      : typeof payload.detail === "string"
        ? payload.detail
        : "Backend override request failed";
  return NextResponse.json({ error }, { status: response.status });
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const backendUrl = getBackendApiUrl("/admin/shows/networks-streaming/overrides");
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const headers = getBackendHeaders();
    if (!headers) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const entityType = request.nextUrl.searchParams.get("entity_type");
    const activeOnly = request.nextUrl.searchParams.get("active_only") ?? "true";
    const upstream = new URL(backendUrl);
    if (entityType) upstream.searchParams.set("entity_type", entityType);
    upstream.searchParams.set("active_only", activeOnly);

    const response = await fetch(upstream.toString(), { method: "GET", headers, cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return backendError(response, payload);
    }
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const backendUrl = getBackendApiUrl("/admin/shows/networks-streaming/overrides");
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const headers = getBackendHeaders();
    if (!headers) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const body =
      request.headers.get("content-type")?.includes("application/json")
        ? ((await request.json().catch(() => ({}))) as Record<string, unknown>)
        : {};

    const response = await fetch(backendUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return backendError(response, payload);
    }
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
