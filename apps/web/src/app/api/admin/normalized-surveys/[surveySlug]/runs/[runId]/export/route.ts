import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import { getSurveyWithQuestions } from "@/lib/server/surveys/survey-run-repository";
import {
  getRunById,
  listResponsesWithAnswers,
} from "@/lib/server/surveys/normalized-survey-admin-repository";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  const needsQuotes = /[",\n]/.test(str);
  if (!needsQuotes) return str;
  return `"${str.replace(/"/g, '""')}"`;
}

function sanitizeFilenamePart(value: string): string {
  return value.trim().replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveySlug: string; runId: string }> },
) {
  try {
    const user = await requireAdmin(request);
    const { surveySlug, runId } = await params;

    const survey = await getSurveyWithQuestions(surveySlug);
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const run = await getRunById(runId);
    if (!run || run.survey_id !== survey.id) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const responses = await listResponsesWithAnswers(
      { firebaseUid: user.uid, isAdmin: true },
      runId,
    );

    const questionOrder = survey.questions.map((q) => q.id);
    const questionKeyById = new Map<string, string>();
    const questionTypeById = new Map<string, string>();
    const optionTextByIdByQuestion = new Map<string, Map<string, string>>();

    for (const q of survey.questions) {
      questionKeyById.set(q.id, q.question_key);
      questionTypeById.set(q.id, q.question_type);
      optionTextByIdByQuestion.set(
        q.id,
        new Map(q.options.map((o) => [o.id, o.option_text])),
      );
    }

    const header = [
      "response_id",
      "created_at",
      "user_id",
      "submission_number",
      "completed_at",
      ...questionOrder.map((id) => questionKeyById.get(id) ?? id),
    ];

    const lines: string[] = [header.join(",")];

    for (const response of responses) {
      const answerByQuestionId = new Map(response.answers.map((a) => [a.question_id, a]));

      const baseCells = [
        response.id,
        response.created_at,
        response.user_id,
        response.submission_number,
        response.completed_at ?? "",
      ];

      const answerCells = questionOrder.map((questionId) => {
        const answer = answerByQuestionId.get(questionId);
        if (!answer) return "";

        const questionType = questionTypeById.get(questionId);
        const optionTextById = optionTextByIdByQuestion.get(questionId) ?? new Map<string, string>();

        if (questionType === "single_choice") {
          if (!answer.option_id) return "";
          return optionTextById.get(answer.option_id) ?? answer.option_id;
        }

        if (questionType === "free_text") {
          return answer.text_value ?? "";
        }

        if (questionType === "numeric" || questionType === "likert") {
          return typeof answer.numeric_value === "number" ? String(answer.numeric_value) : "";
        }

        if (questionType === "multi_choice" || questionType === "ranking") {
          const value = answer.json_value;
          if (value === null || value === undefined) return "";
          if (Array.isArray(value)) {
            return value
              .map((item) => {
                if (typeof item === "string") return optionTextById.get(item) ?? item;
                return JSON.stringify(item);
              })
              .join(" | ");
          }
          if (typeof value === "string") {
            return optionTextById.get(value) ?? value;
          }
          return JSON.stringify(value);
        }

        // Unknown type: fall back to whatever is populated.
        if (answer.text_value) return answer.text_value;
        if (typeof answer.numeric_value === "number") return String(answer.numeric_value);
        if (answer.option_id) return optionTextById.get(answer.option_id) ?? answer.option_id;
        if (answer.json_value !== null && answer.json_value !== undefined) return JSON.stringify(answer.json_value);
        return "";
      });

      const row = [...baseCells, ...answerCells].map(csvCell).join(",");
      lines.push(row);
    }

    const timestamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
    const safeRunKey = sanitizeFilenamePart(run.run_key || "run");
    const filename = `${sanitizeFilenamePart(surveySlug)}-${safeRunKey}-responses-${timestamp}.csv`;

    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename=\"${filename}\"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api] Failed to export normalized survey responses", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

