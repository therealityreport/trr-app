import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

const LINKS_READ_TIMEOUT_MS = 8_000;

const buildDegradedLinksPayload = () => ({
  links: [],
  degraded: true,
  degraded_reason: "backend_timeout",
});

const isDegradableLinksError = (error: unknown): boolean =>
  error instanceof Error && (error.name === "AbortError" || /timed out|timeout|aborted/i.test(error.message));

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId } = await params;
    const backendUrl = getBackendApiUrl(`/admin/shows/${showId}/links`);
    if (!backendUrl) return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const url = new URL(backendUrl);
    searchParams.forEach((value, key) => url.searchParams.set(key, value));

    const serviceRoleKey = getInternalAdminBearerToken();
    if (!serviceRoleKey) return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LINKS_READ_TIMEOUT_MS);
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${serviceRoleKey}` },
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    const data = await response.json().catch(() => ({}));
    if (response.status === 504) {
      return NextResponse.json(buildDegradedLinksPayload(), {
        headers: { "x-trr-show-links-source": "backend-timeout-degraded" },
      });
    }
    if (!response.ok) {
      return NextResponse.json({ error: (data as { error?: string; detail?: string }).error || (data as { detail?: string }).detail || "Failed to list links" }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    if (isDegradableLinksError(error)) {
      return NextResponse.json(buildDegradedLinksPayload(), {
        headers: { "x-trr-show-links-source": "backend-timeout-degraded" },
      });
    }
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId } = await params;
    const backendUrl = getBackendApiUrl(`/admin/shows/${showId}/links`);
    if (!backendUrl) return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });

    const serviceRoleKey = getInternalAdminBearerToken();
    if (!serviceRoleKey) return NextResponse.json({ error: "Backend auth not configured" }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: (data as { error?: string; detail?: string }).error || (data as { detail?: string }).detail || "Failed to create link" }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
