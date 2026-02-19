import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  fetchSeasonBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { isValidPositiveIntegerString, isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    showId: string;
    seasonNumber: string;
    platform: string;
    sourceId: string;
  }>;
}

const PLATFORM_ALLOWLIST = new Set(["instagram", "tiktok", "twitter", "youtube"]);
const SOURCE_ID_RE = /^[A-Za-z0-9._:-]{1,200}$/;

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId, seasonNumber, platform, sourceId } = await params;
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
    if (!PLATFORM_ALLOWLIST.has(platform)) {
      return NextResponse.json(
        { error: "platform must be one of instagram, tiktok, twitter, youtube", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    if (!SOURCE_ID_RE.test(sourceId)) {
      return NextResponse.json(
        { error: "sourceId has an invalid format", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }

    const data = await fetchSeasonBackendJson(
      showId,
      seasonNumber,
      `/analytics/posts/${platform}/${sourceId}`,
      {
        queryString: request.nextUrl.searchParams.toString(),
        fallbackError: "Failed to fetch post comments",
        retries: 2,
        timeoutMs: 20_000,
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to fetch post comments");
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId, seasonNumber, platform, sourceId } = await params;
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
    if (!PLATFORM_ALLOWLIST.has(platform)) {
      return NextResponse.json(
        { error: "platform must be one of instagram, tiktok, twitter, youtube", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }
    if (!SOURCE_ID_RE.test(sourceId)) {
      return NextResponse.json(
        { error: "sourceId has an invalid format", code: "BAD_REQUEST", retryable: false },
        { status: 400 },
      );
    }

    const data = await fetchSeasonBackendJson(
      showId,
      seasonNumber,
      `/analytics/posts/${platform}/${sourceId}/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: await request.text(),
        fallbackError: "Failed to refresh post comments",
        retries: 0,
        timeoutMs: 30_000,
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to refresh post comments");
  }
}
