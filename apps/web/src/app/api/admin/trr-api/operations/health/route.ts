import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";

export const dynamic = "force-dynamic";

const MAX_COMPAT_OPERATIONS_HEALTH_LIMIT = 100;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const backendUrl = getBackendApiUrl("/admin/operations/health");
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = getInternalAdminBearerToken();
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const url = new URL(backendUrl);
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      if (key === "limit") {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed)) {
          url.searchParams.set(key, String(Math.min(Math.max(parsed, 1), MAX_COMPAT_OPERATIONS_HEALTH_LIMIT)));
          continue;
        }
      }
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const error =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : "Failed to fetch admin operations health";
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
