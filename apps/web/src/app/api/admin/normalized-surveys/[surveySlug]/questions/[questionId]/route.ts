import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import {
  deleteQuestion,
  getQuestionById,
  listOptions,
  updateQuestion,
  type UpdateQuestionInput,
} from "@/lib/server/surveys/normalized-survey-admin-repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string; questionId: string }> },
) {
  try {
    await requireAdmin(request);
    const { questionId } = await params;

    const question = await getQuestionById(questionId);
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const options = await listOptions(questionId);

    return NextResponse.json({ question: { ...question, options } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to get question", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string; questionId: string }> },
) {
  try {
    const user = await requireAdmin(request);
    const { questionId } = await params;
    const body = (await request.json()) as UpdateQuestionInput;

    const existing = await getQuestionById(questionId);
    if (!existing) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const question = await updateQuestion(
      { firebaseUid: user.uid, isAdmin: true },
      questionId,
      body,
    );

    return NextResponse.json({ question });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to update question", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string; questionId: string }> },
) {
  try {
    const user = await requireAdmin(request);
    const { questionId } = await params;

    const existing = await getQuestionById(questionId);
    if (!existing) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    await deleteQuestion({ firebaseUid: user.uid, isAdmin: true }, questionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to delete question", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
