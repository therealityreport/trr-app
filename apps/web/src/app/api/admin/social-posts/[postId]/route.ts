import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import {
  getPostById,
  updatePost,
  deletePost,
  type SocialPlatform,
} from "@/lib/server/admin/social-posts-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ postId: string }>;
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
 * GET /api/admin/social-posts/[postId]
 *
 * Get a single social post by ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { postId } = await params;

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 }
      );
    }

    const post = await getPostById(postId);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("[api] Failed to get social post", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/admin/social-posts/[postId]
 *
 * Update a social post.
 *
 * Request body:
 * - platform: "reddit" | "twitter" | "instagram" | "tiktok" | "youtube" | "other" (optional)
 * - url: string (optional)
 * - trr_season_id: string | null (optional)
 * - title: string | null (optional)
 * - notes: string | null (optional)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };

    const { postId } = await params;

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { platform, url, trr_season_id, title, notes } = body;

    // Validate platform if provided
    if (platform !== undefined && !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: `platform must be one of: ${VALID_PLATFORMS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate URL if provided
    if (url !== undefined) {
      if (typeof url !== "string") {
        return NextResponse.json(
          { error: "url must be a string" },
          { status: 400 }
        );
      }
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { error: "url must be a valid URL" },
          { status: 400 }
        );
      }
    }

    const post = await updatePost(authContext, postId, {
      platform,
      url,
      trr_season_id,
      title,
      notes,
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("[api] Failed to update social post", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/admin/social-posts/[postId]
 *
 * Delete a social post.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };

    const { postId } = await params;

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 }
      );
    }

    const deleted = await deletePost(authContext, postId);

    if (!deleted) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] Failed to delete social post", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
