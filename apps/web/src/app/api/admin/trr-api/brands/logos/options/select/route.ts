import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";

export const dynamic = "force-dynamic";

const brandLogoRoutingEnabled = (): boolean =>
  (process.env.BRAND_LOGO_ROUTING_V2 ?? process.env.NEXT_PUBLIC_BRAND_LOGO_ROUTING_V2 ?? "true").toLowerCase() !==
  "false";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    if (!brandLogoRoutingEnabled()) {
      return NextResponse.json({ error: "Brand logo routing is disabled" }, { status: 404 });
    }

    const backendUrl = getBackendApiUrl("/admin/brands/logos/options/select");
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = getInternalAdminBearerToken();
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    const body =
      request.headers.get("content-type")?.includes("application/json")
        ? ((await request.json().catch(() => ({}))) as Record<string, unknown>)
        : {};

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const error =
        typeof payload.error === "string"
          ? payload.error
          : typeof payload.detail === "string"
            ? payload.detail
            : "Failed to save selected logo option";
      return NextResponse.json({ error }, { status: response.status });
    }
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
