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

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId, seasonNumber } = await params;
    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }

    const seasonId = await resolveSeasonId(showId, seasonNumber);
    const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "csv";
    const backendPath =
      format === "pdf"
        ? `/admin/socials/seasons/${seasonId}/analytics/export.pdf`
        : `/admin/socials/seasons/${seasonId}/analytics/export.csv`;

    const backendBase = getBackendApiUrl(backendPath);
    if (!backendBase) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const proxyParams = new URLSearchParams(request.nextUrl.searchParams);
    proxyParams.delete("format");
    const backendUrl = proxyParams.toString() ? `${backendBase}?${proxyParams.toString()}` : backendBase;

    const response = await fetch(backendUrl, {
      headers: {
        Authorization: `Bearer ${getServiceRoleKey()}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const error =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : `Failed to export ${format.toUpperCase()}`;
      return NextResponse.json({ error }, { status: response.status });
    }

    const contentType = response.headers.get("content-type") ?? (format === "pdf" ? "application/pdf" : "text/csv");
    const disposition = response.headers.get("content-disposition") ??
      `attachment; filename="social_report_${showId}_s${seasonNumber}.${format}"`;

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-disposition": disposition,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("[api] Failed to export social analytics", error);
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
