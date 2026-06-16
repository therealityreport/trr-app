import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";

export const dynamic = "force-dynamic";

const fetchJsonWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ response: Response; data: Record<string, unknown> }> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
};

const proxyShowCoreAutoRefreshSettings = async (
  request: NextRequest,
  method: "GET" | "PUT",
): Promise<NextResponse> => {
  try {
    await requireAdmin(request);

    const backendUrl = getBackendApiUrl("/admin/shows/settings/show-core-auto-refresh");
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const serviceRoleKey = getInternalAdminBearerToken();
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });
    }

    let body: Record<string, unknown> | undefined;
    if (method === "PUT" && request.headers.get("content-type")?.includes("application/json")) {
      body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    }

    const { response, data } = await fetchJsonWithTimeout(
      backendUrl,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        ...(method === "PUT" ? { body: JSON.stringify(body ?? {}) } : {}),
      },
      30_000,
    );

    if (!response.ok) {
      const errorMessage =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : "Show core auto-refresh settings request failed";
      return NextResponse.json({ error: errorMessage, detail: data.detail }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to proxy show core auto-refresh settings", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
};

export async function GET(request: NextRequest) {
  return proxyShowCoreAutoRefreshSettings(request, "GET");
}

export async function PUT(request: NextRequest) {
  return proxyShowCoreAutoRefreshSettings(request, "PUT");
}
