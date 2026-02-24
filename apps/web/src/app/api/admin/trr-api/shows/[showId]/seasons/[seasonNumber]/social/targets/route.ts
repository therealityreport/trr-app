import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSeasonBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidPositiveIntegerString, isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string; seasonNumber: string }>;
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const isValidTargetsPayload = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  if (payload.targets === undefined) return true;
  if (!Array.isArray(payload.targets)) return false;
  return payload.targets.every((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const target = entry as Record<string, unknown>;
    if (typeof target.platform !== "string" || target.platform.trim().length === 0) return false;
    if (target.accounts !== undefined && !isStringArray(target.accounts)) return false;
    if (target.hashtags !== undefined && !isStringArray(target.hashtags)) return false;
    if (target.keywords !== undefined && !isStringArray(target.keywords)) return false;
    if (target.is_active !== undefined && typeof target.is_active !== "boolean") return false;
    return true;
  });
};

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const forwardedSearchParams = new URLSearchParams(request.nextUrl.searchParams.toString());
    const seasonIdHintRaw = forwardedSearchParams.get("season_id");
    if (seasonIdHintRaw && !isValidUuid(seasonIdHintRaw)) {
      return NextResponse.json(
        { error: "season_id must be a valid UUID", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    const seasonIdHint = seasonIdHintRaw ?? undefined;
    forwardedSearchParams.delete("season_id");

    const data = await fetchSeasonBackendJson(showId, seasonNumber, "/targets", {
      queryString: forwardedSearchParams.toString(),
      seasonIdHint,
      fallbackError: "Failed to fetch social targets",
      retries: 0,
      timeoutMs: 12_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch social targets");
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const body = (await request.json().catch(() => null)) as unknown;
    if (!isValidTargetsPayload(body)) {
      return NextResponse.json(
        { error: "Request body must be a valid targets payload object", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }

    const data = await fetchSeasonBackendJson(showId, seasonNumber, "/targets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      fallbackError: "Failed to update social targets",
      retries: 0,
      timeoutMs: 30_000,
    });
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to update social targets");
  }
}
