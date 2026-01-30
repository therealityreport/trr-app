import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  getPostsByShowId,
  createPost,
  type SocialPlatform,
} from "@/lib/server/admin/social-posts-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

const VALID_PLATFORMS: SocialPlatform[] = [
  "reddit",
  "twitter",
  "instagram",
  "tiktok",
  "youtube",
  "other",
];

/**
 * GET /api/admin/trr-api/shows/[showId]/social-posts
 *
 * List all social posts for a TRR show.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { showId } = await params;

    if (!showId) {
      return NextResponse.json(
        { error: "showId is required" },
        { status: 400 }
      );
    }

    const posts = await getPostsByShowId(showId);

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("[api] Failed to list social posts for TRR show", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/admin/trr-api/shows/[showId]/social-posts
 *
 * Create a new social post for a TRR show.
 *
 * Request body:
 * - platform: "reddit" | "twitter" | "instagram" | "tiktok" | "youtube" | "other" (required)
 * - url: string (required)
 * - trr_season_id: string (optional)
 * - title: string (optional)
 * - notes: string (optional)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };

    const { showId } = await params;

    if (!showId) {
      return NextResponse.json(
        { error: "showId is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { platform, url, trr_season_id, title, notes } = body;

    // Validate required fields
    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: `platform must be one of: ${VALID_PLATFORMS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "url is required and must be a string" },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "url must be a valid URL" },
        { status: 400 }
      );
    }

    const post = await createPost(authContext, {
      trr_show_id: showId,
      trr_season_id: trr_season_id ?? null,
      platform,
      url,
      title: title ?? null,
      notes: notes ?? null,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to create social post", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
