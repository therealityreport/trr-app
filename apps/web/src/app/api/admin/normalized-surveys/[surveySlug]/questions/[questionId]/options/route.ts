import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import {
  createOption,
  deleteOption,
  getOptionById,
  getQuestionById,
  listOptions,
  updateOption,
  type CreateOptionInput,
  type UpdateOptionInput,
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
    return NextResponse.json({ options });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to list options", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string; questionId: string }> },
) {
  try {
    const user = await requireAdmin(request);
    const { questionId } = await params;
    const body = (await request.json()) as Omit<CreateOptionInput, "question_id">;

    const question = await getQuestionById(questionId);
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    if (!body.option_key || !body.option_text) {
      return NextResponse.json(
        { error: "option_key and option_text are required" },
        { status: 400 },
      );
    }

    const option = await createOption(
      { firebaseUid: user.uid, isAdmin: true },
      { ...body, question_id: questionId },
    );

    return NextResponse.json({ option }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes("duplicate key") || message.includes("unique constraint")) {
      return NextResponse.json({ error: "Option with this key already exists" }, { status: 409 });
    }
    console.error("[api] Failed to create option", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
) {
  try {
    const user = await requireAdmin(request);
    const body = (await request.json()) as UpdateOptionInput & { optionId: string };

    if (!body.optionId) {
      return NextResponse.json({ error: "optionId is required" }, { status: 400 });
    }

    const existing = await getOptionById(body.optionId);
    if (!existing) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 });
    }

    const { optionId, ...updates } = body;
    const option = await updateOption(
      { firebaseUid: user.uid, isAdmin: true },
      optionId,
      updates,
    );

    return NextResponse.json({ option });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to update option", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
) {
  try {
    const user = await requireAdmin(request);
    const url = new URL(request.url);
    const optionId = url.searchParams.get("optionId");

    if (!optionId) {
      return NextResponse.json({ error: "optionId query param is required" }, { status: 400 });
    }

    const existing = await getOptionById(optionId);
    if (!existing) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 });
    }

    await deleteOption({ firebaseUid: user.uid, isAdmin: true }, optionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to delete option", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
