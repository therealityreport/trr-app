import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import { setFlashbackQuizPublished } from "@/lib/server/admin/flashback-admin-repository";
import { AdminReadProxyError } from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ quizId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const adminContext = toVerifiedAdminContext(await requireAdmin(request));
    const { quizId } = await params;
    const body = (await request.json().catch(() => ({}))) as { is_published?: unknown };

    if (typeof body.is_published !== "boolean") {
      return NextResponse.json(
        { error: "is_published must be a boolean" },
        { status: 400 },
      );
    }

    const quiz = await setFlashbackQuizPublished(adminContext, quizId, body.is_published);
    if (!quiz) {
      return NextResponse.json({ error: "quiz not found" }, { status: 404 });
    }
    return NextResponse.json({ quiz });
  } catch (error) {
    console.error("[api/admin/flashback/quizzes/[quizId]] Failed to update quiz", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      error instanceof AdminReadProxyError
        ? error.status
        : message === "unauthorized"
          ? 401
          : message === "forbidden"
            ? 403
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
