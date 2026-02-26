import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

const showsFranchisesEnabled = (): boolean =>
  (process.env.BRANDS_SHOWS_FRANCHISES_ENABLED ??
    process.env.NEXT_PUBLIC_BRANDS_SHOWS_FRANCHISES_ENABLED ??
    "true") !== "false";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    if (!showsFranchisesEnabled()) {
      return NextResponse.json({ error: "Shows & franchises is disabled" }, { status: 404 });
    }

    const backendUrl = getBackendApiUrl("/admin/brands/shows-franchises");
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const upstream = new URL(backendUrl);
    request.nextUrl.searchParams.forEach((value, key) => {
      upstream.searchParams.set(key, value);
    });

    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const error =
        typeof payload.error === "string"
          ? payload.error
          : typeof payload.detail === "string"
            ? payload.detail
            : "Failed to fetch shows & franchises";
      return NextResponse.json({ error }, { status: response.status });
    }
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
