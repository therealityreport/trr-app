import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getSeasonByShowAndNumber } from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string }>;
}

const getServiceRoleKey = (): string => {
  const value = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error("Backend auth not configured");
  }
  return value;
};

const resolveSeasonId = async (showId: string, seasonNumberRaw: string): Promise<string> => {
  const seasonNumber = Number.parseInt(seasonNumberRaw, 10);
  if (!Number.isFinite(seasonNumber)) {
    throw new Error("seasonNumber is invalid");
  }
  const season = await getSeasonByShowAndNumber(showId, seasonNumber);
  if (!season?.id) {
    throw new Error("season not found");
  }
  return season.id;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId, seasonNumber } = await params;
    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    const seasonId = await resolveSeasonId(showId, seasonNumber);
    const backendUrl = getBackendApiUrl(`/admin/socials/seasons/${seasonId}/ingest`);
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const body = await request.text();
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getServiceRoleKey()}`,
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
    });

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const error =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : "Failed to run social ingest";
      return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to run social ingest", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "season not found"
            ? 404
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
