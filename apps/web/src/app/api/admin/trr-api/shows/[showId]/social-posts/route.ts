import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

const VALID_PLATFORMS = [
  "reddit",
  "twitter",
  "instagram",
  "tiktok",
  "youtube",
  "other",
] as const;

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { showId } = await params;

    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }
    if (!isValidUuid(showId)) {
      return NextResponse.json({ error: "showId must be a valid UUID" }, { status: 400 });
    }

    const trrSeasonId = request.nextUrl.searchParams.get("trr_season_id");
    if (trrSeasonId && !isValidUuid(trrSeasonId)) {
      return NextResponse.json({ error: "trr_season_id must be a valid UUID" }, { status: 400 });
    }

    const upstream = await fetchAdminBackendJson(`/admin/shows/${showId}/social-posts`, {
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "social-posts:list",
      headers: { "X-TRR-Admin-User-Uid": user.uid },
      queryString: trrSeasonId ? `trr_season_id=${encodeURIComponent(trrSeasonId)}` : "",
    });

    if (upstream.status === 400 || upstream.status === 404) {
      return NextResponse.json(
        {
          error:
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to list social posts",
        },
        { status: upstream.status },
      );
    }
    if (upstream.status !== 200) {
      throw new Error(
        typeof upstream.data.error === "string"
          ? upstream.data.error
          : typeof upstream.data.detail === "string"
            ? upstream.data.detail
            : "Failed to list social posts",
      );
    }

    return NextResponse.json(upstream.data);
  } catch (error) {
    console.error("[api] Failed to list social posts for TRR show", error);
    return buildAdminProxyErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { showId } = await params;

    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }
    if (!isValidUuid(showId)) {
      return NextResponse.json({ error: "showId must be a valid UUID" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      platform?: string;
      url?: string;
      trr_season_id?: string | null;
      title?: string | null;
      notes?: string | null;
    };

    if (!body.platform || !VALID_PLATFORMS.includes(body.platform as (typeof VALID_PLATFORMS)[number])) {
      return NextResponse.json(
        { error: `platform must be one of: ${VALID_PLATFORMS.join(", ")}` },
        { status: 400 },
      );
    }
    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json({ error: "url is required and must be a string" }, { status: 400 });
    }
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json({ error: "url must be a valid URL" }, { status: 400 });
    }
    if (body.trr_season_id !== undefined && body.trr_season_id !== null) {
      if (typeof body.trr_season_id !== "string" || !isValidUuid(body.trr_season_id)) {
        return NextResponse.json(
          { error: "trr_season_id must be a valid UUID when provided" },
          { status: 400 },
        );
      }
    }

    const upstream = await fetchAdminBackendJson(`/admin/shows/${showId}/social-posts`, {
      method: "POST",
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "social-posts:create",
      headers: {
        "Content-Type": "application/json",
        "X-TRR-Admin-User-Uid": user.uid,
      },
      body: JSON.stringify({
        platform: body.platform,
        url: body.url,
        trr_season_id: body.trr_season_id ?? null,
        title: body.title ?? null,
        notes: body.notes ?? null,
      }),
    });

    if (upstream.status === 400 || upstream.status === 404) {
      return NextResponse.json(
        {
          error:
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Failed to create social post",
        },
        { status: upstream.status },
      );
    }
    if (upstream.status !== 201) {
      throw new Error(
        typeof upstream.data.error === "string"
          ? upstream.data.error
          : typeof upstream.data.detail === "string"
            ? upstream.data.detail
            : "Failed to create social post",
      );
    }

    return NextResponse.json(upstream.data, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to create social post", error);
    return buildAdminProxyErrorResponse(error);
  }
}
