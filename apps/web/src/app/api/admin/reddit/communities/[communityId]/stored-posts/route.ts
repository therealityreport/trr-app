import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getStoredWindowPostsByCommunityAndSeason } from "@/lib/server/admin/reddit-sources-repository";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { communityId } = await params;
    if (!communityId || !isValidUuid(communityId)) {
      return NextResponse.json({ error: "communityId must be a valid UUID" }, { status: 400 });
    }

    const seasonId = request.nextUrl.searchParams.get("season_id");
    if (!seasonId || !isValidUuid(seasonId)) {
      return NextResponse.json({ error: "season_id must be a valid UUID" }, { status: 400 });
    }

    const containerKey = request.nextUrl.searchParams.get("container_key");
    if (!containerKey) {
      return NextResponse.json({ error: "container_key is required" }, { status: 400 });
    }

    const pageParam = Number.parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
    const perPageParam = Number.parseInt(request.nextUrl.searchParams.get("per_page") ?? "200", 10);

    const payload = await getStoredWindowPostsByCommunityAndSeason(
      communityId,
      seasonId,
      containerKey,
      Number.isFinite(pageParam) ? pageParam : 1,
      Number.isFinite(perPageParam) ? perPageParam : 200,
    );
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] Failed to fetch stored reddit window posts", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.includes("container_key")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
