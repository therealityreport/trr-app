import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSeasonBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidPositiveIntegerString, isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

const SUPPORTED_PLATFORMS = new Set(["instagram", "tiktok", "twitter", "youtube", "facebook", "threads"]);

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string }>;
}

const isValidIsoDateTime = (value: string): boolean => {
  if (!value.includes("T")) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
};

type RequeueBody = {
  platform?: string;
  source_scope?: string;
  limit?: number;
  failed_only?: boolean;
  date_start?: string;
  date_end?: string;
  season_id?: string;
};

const toQueryValue = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return null;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId, seasonNumber } = await params;
    if (!showId) {
      return NextResponse.json({ error: "showId is required", code: "BAD_REQUEST", retryable: false }, { status: 400 });
    }
    if (!isValidUuid(showId)) {
      return NextResponse.json(
        { error: "showId must be a valid UUID", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    if (!isValidPositiveIntegerString(seasonNumber)) {
      return NextResponse.json(
        { error: "seasonNumber must be a valid positive integer", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }

    let body: RequeueBody = {};
    try {
      const parsed = (await request.json()) as RequeueBody;
      if (parsed && typeof parsed === "object") {
        body = parsed;
      }
    } catch {
      body = {};
    }

    const forwardedSearchParams = new URLSearchParams(request.nextUrl.searchParams.toString());
    const platformRaw = forwardedSearchParams.get("platform") ?? toQueryValue(body.platform);
    const platform = String(platformRaw ?? "").trim().toLowerCase();
    if (!SUPPORTED_PLATFORMS.has(platform)) {
      return NextResponse.json(
        {
          error: "platform must be one of instagram, tiktok, twitter, youtube, facebook, threads",
          code: "BAD_REQUEST",
          retryable: false,
        },
        { status: 400 },
      );
    }
    forwardedSearchParams.delete("platform");

    const seasonIdHintRaw =
      forwardedSearchParams.get("season_id") ?? toQueryValue(body.season_id);
    if (seasonIdHintRaw && !isValidUuid(seasonIdHintRaw)) {
      return NextResponse.json(
        { error: "season_id must be a valid UUID", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    const seasonIdHint = seasonIdHintRaw ?? undefined;
    forwardedSearchParams.delete("season_id");

    for (const key of ["source_scope", "limit", "failed_only", "date_start", "date_end"] as const) {
      if (!forwardedSearchParams.has(key)) {
        const fromBody = toQueryValue(body[key]);
        if (fromBody) {
          forwardedSearchParams.set(key, fromBody);
        }
      }
    }

    for (const key of ["date_start", "date_end"] as const) {
      const value = forwardedSearchParams.get(key);
      if (value && !isValidIsoDateTime(value)) {
        return NextResponse.json(
          { error: `${key} must be a valid ISO datetime`, code: "BAD_REQUEST", retryable: false },
          { status: 400 },
        );
      }
    }

    const data = await fetchSeasonBackendJson(showId, seasonNumber, `/${platform}/mirror/requeue`, {
      method: "POST",
      seasonIdHint,
      queryString: forwardedSearchParams.toString(),
      fallbackError: "Failed to requeue mirror jobs",
      retries: 0,
      timeoutMs: 45_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to requeue mirror jobs");
  }
}
