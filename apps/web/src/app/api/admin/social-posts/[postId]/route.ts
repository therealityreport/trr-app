import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminProxyErrorResponse,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

const VALID_PLATFORMS = [
  "reddit",
  "twitter",
  "instagram",
  "tiktok",
  "youtube",
  "other",
] as const;

const getWriteHeaders = (uid: string, includeJson = false): Record<string, string> => {
  const serviceRoleKey =
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Backend auth not configured");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${serviceRoleKey.trim()}`,
    "X-TRR-Admin-User-Uid": uid,
  };
  const internalSecret = process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET?.trim();
  if (internalSecret) {
    headers["X-TRR-Internal-Admin-Secret"] = internalSecret;
  }
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { postId } = await params;

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }
    if (!isValidUuid(postId)) {
      return NextResponse.json({ error: "postId must be a valid UUID" }, { status: 400 });
    }

    const upstream = await fetchAdminBackendJson(`/admin/social-posts/${postId}`, {
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "social-posts:detail",
      headers: { "X-TRR-Admin-User-Uid": user.uid },
    });
    if (upstream.status === 404) {
      return NextResponse.json(
        {
          error:
            typeof upstream.data.error === "string"
              ? upstream.data.error
              : typeof upstream.data.detail === "string"
                ? upstream.data.detail
                : "Post not found",
        },
        { status: 404 },
      );
    }
    if (upstream.status !== 200) {
      throw new Error(
        typeof upstream.data.error === "string"
          ? upstream.data.error
          : typeof upstream.data.detail === "string"
            ? upstream.data.detail
            : "Failed to get social post",
      );
    }

    return NextResponse.json(upstream.data);
  } catch (error) {
    console.error("[api] Failed to get social post", error);
    return buildAdminProxyErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { postId } = await params;

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }
    if (!isValidUuid(postId)) {
      return NextResponse.json({ error: "postId must be a valid UUID" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      platform?: string;
      url?: string;
      trr_season_id?: string | null;
      title?: string | null;
      notes?: string | null;
    };

    if (body.platform !== undefined && !VALID_PLATFORMS.includes(body.platform as (typeof VALID_PLATFORMS)[number])) {
      return NextResponse.json(
        { error: `platform must be one of: ${VALID_PLATFORMS.join(", ")}` },
        { status: 400 },
      );
    }
    if (body.url !== undefined) {
      if (typeof body.url !== "string") {
        return NextResponse.json({ error: "url must be a string" }, { status: 400 });
      }
      try {
        new URL(body.url);
      } catch {
        return NextResponse.json({ error: "url must be a valid URL" }, { status: 400 });
      }
    }
    if (body.trr_season_id !== undefined && body.trr_season_id !== null) {
      if (typeof body.trr_season_id !== "string" || !isValidUuid(body.trr_season_id)) {
        return NextResponse.json(
          { error: "trr_season_id must be a valid UUID when provided" },
          { status: 400 },
        );
      }
    }

    const backendUrl = getBackendApiUrl(`/admin/social-posts/${postId}`);
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const response = await fetch(backendUrl, {
      method: "PUT",
      headers: getWriteHeaders(user.uid, true),
      body: JSON.stringify({
        platform: body.platform,
        url: body.url,
        trr_season_id: body.trr_season_id,
        title: body.title,
        notes: body.notes,
      }),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; detail?: string };

    if (response.status === 400 || response.status === 404) {
      return NextResponse.json(
        { error: data.error ?? data.detail ?? (response.status === 404 ? "Post not found" : "Failed to update social post") },
        { status: response.status },
      );
    }
    if (!response.ok) {
      throw new Error(data.error ?? data.detail ?? "Failed to update social post");
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api] Failed to update social post", error);
    return buildAdminProxyErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { postId } = await params;

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }
    if (!isValidUuid(postId)) {
      return NextResponse.json({ error: "postId must be a valid UUID" }, { status: 400 });
    }

    const backendUrl = getBackendApiUrl(`/admin/social-posts/${postId}`);
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const response = await fetch(backendUrl, {
      method: "DELETE",
      headers: getWriteHeaders(user.uid),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; detail?: string };

    if (response.status === 404) {
      return NextResponse.json({ error: data.error ?? data.detail ?? "Post not found" }, { status: 404 });
    }
    if (!response.ok) {
      throw new Error(data.error ?? data.detail ?? "Failed to delete social post");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to delete social post", error);
    return buildAdminProxyErrorResponse(error);
  }
}
