import { NextRequest, NextResponse } from "next/server";

import {
  createFlashbackQuiz,
  listFlashbackQuizzes,
} from "@/lib/server/admin/flashback-admin-repository";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ quizzes: await listFlashbackQuizzes() });
  } catch (error) {
    console.error("[api/admin/flashback/quizzes] Failed to list quizzes", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      publish_date?: string;
      description?: string | null;
    };
    const title = body.title?.trim();
    const publishDate = body.publish_date?.trim();
    if (!title || !publishDate) {
      return NextResponse.json(
        { error: "title and publish_date are required" },
        { status: 400 },
      );
    }

    const quiz = await createFlashbackQuiz({
      title,
      publishDate,
      description: body.description ?? null,
    });
    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/flashback/quizzes] Failed to create quiz", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
