import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

const backendAuthHeaders = (): { Authorization: string } | null => {
  const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;
  return { Authorization: `Bearer ${serviceRoleKey}` };
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const backendUrl = getBackendApiUrl("/admin/brands/families");
    if (!backendUrl) return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });

    const auth = backendAuthHeaders();
    if (!auth) return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });

    const upstream = new URL(backendUrl);
    request.nextUrl.searchParams.forEach((value, key) => upstream.searchParams.set(key, value));

    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: auth,
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const error =
        typeof payload.error === "string"
          ? payload.error
          : typeof payload.detail === "string"
            ? payload.detail
            : "Failed to fetch families";
      return NextResponse.json({ error }, { status: response.status });
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
    const backendUrl = getBackendApiUrl("/admin/brands/families");
    if (!backendUrl) return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });

    const auth = backendAuthHeaders();
    if (!auth) return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });

    const body =
      request.headers.get("content-type")?.includes("application/json")
        ? ((await request.json().catch(() => ({}))) as Record<string, unknown>)
        : {};

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...auth,
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const error =
        typeof payload.error === "string"
          ? payload.error
          : typeof payload.detail === "string"
            ? payload.detail
            : "Failed to create family";
      return NextResponse.json({ error }, { status: response.status });
    }
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
