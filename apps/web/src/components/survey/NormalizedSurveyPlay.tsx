"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useNormalizedSurvey } from "@/hooks/useNormalizedSurvey";
import QuestionRenderer from "./QuestionRenderer";
import type { AnswerInput } from "@/lib/surveys/normalized-types";
import { isQuestionComplete } from "./isQuestionComplete";
import { resolveSingleChoiceOptionId } from "./answerMapping";
import { groupBySection } from "@/lib/surveys/section-grouping";

export interface NormalizedSurveyPlayProps {
  surveySlug: string;
  /** URL to redirect to after successful submission */
  successRedirect?: string;
  /** URL for the back button */
  backUrl?: string;
}

export default function NormalizedSurveyPlay({
  surveySlug,
  successRedirect,
  backUrl,
}: NormalizedSurveyPlayProps) {
  const router = useRouter();

  // Helper to navigate with proper typing
  const navigate = React.useCallback(
    (url: string) => router.push(url as Parameters<typeof router.push>[0]),
    [router]
  );
  const {
    loading,
    survey,
    activeRun,
    canSubmit,
    submitting,
    error,
    submit,
  } = useNormalizedSurvey(surveySlug);

  // Local state for answers
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  // Track which questions have been answered
  const answeredCount = React.useMemo(() => {
    if (!survey) return 0;
    return survey.questions.filter((q) => isQuestionComplete(q, answers[q.id])).length;
  }, [survey, answers]);

  const totalQuestions = survey?.questions.length ?? 0;
  const completionPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const questionsForRender = React.useMemo(() => {
    if (!survey) return [];
    const groups = groupBySection(survey.questions, (q) => {
      const cfg = q.config as { section?: unknown } | null | undefined;
      return typeof cfg?.section === "string" ? cfg.section : "";
    });

    const out: Array<{
      question: (typeof survey.questions)[number];
      index: number;
      section: string;
      showSectionHeader: boolean;
    }> = [];

    let displayIndex = 0;
    for (const group of groups) {
      for (const [i, { item: question }] of group.items.entries()) {
        out.push({
          question,
          index: displayIndex,
          section: group.label,
          showSectionHeader: group.key !== "~~ungrouped" && i === 0,
        });
        displayIndex += 1;
      }
    }

    return out;
  }, [survey]);

  // Check if all required questions are answered
  const requiredComplete = React.useMemo(() => {
    if (!survey) return false;
    const required = survey.questions.filter((q) => q.is_required);
    return required.every((q) => isQuestionComplete(q, answers[q.id]));
  }, [survey, answers]);

  const handleAnswerChange = React.useCallback((questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSubmit = React.useCallback(async () => {
    if (!survey) return;

    setSubmitError(null);

    // Build answer inputs
    const answerInputs: AnswerInput[] = survey.questions.map((question) => {
      const value = answers[question.id];
      const input: AnswerInput = { questionId: question.id };

      switch (question.question_type) {
        case "single_choice":
          input.optionId = resolveSingleChoiceOptionId(
            question.options ?? [],
            value as string | null | undefined,
          );
          break;
        case "multi_choice":
        case "ranking":
          input.jsonValue = value;
          break;
        case "likert": {
          // All current likert UI variants in this app are matrix-style and
          // emit an object map of rowId -> optionKey.
          input.jsonValue = value;
          break;
        }
        case "numeric":
          input.numericValue = value as number | undefined;
          break;
        case "free_text":
          input.textValue = value as string | undefined;
          break;
      }

      return input;
    });

    const success = await submit(answerInputs);
    if (success) {
      setSubmitted(true);
      if (successRedirect) {
        navigate(successRedirect);
      }
    } else {
      setSubmitError(error ?? "Submission failed. Please try again.");
    }
  }, [survey, answers, submit, error, successRedirect, navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !survey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900">Unable to Load Survey</h1>
          <p className="mt-4 text-sm text-gray-600">{error}</p>
          {backUrl && (
            <button
              type="button"
              onClick={() => navigate(backUrl)}
              className="mt-6 inline-flex items-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // No active run
  if (!activeRun || !survey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900">Survey Not Available</h1>
          <p className="mt-4 text-sm text-gray-600">
            This survey is not currently active. Please check back later.
          </p>
          {backUrl && (
            <button
              type="button"
              onClick={() => navigate(backUrl)}
              className="mt-6 inline-flex items-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // Already submitted
  if (submitted || !canSubmit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-green-600">Thank You!</h1>
          <p className="mt-4 text-sm text-gray-600">
            {submitted ? "Your response has been submitted." : "You have already submitted this survey."}
          </p>
          {successRedirect && (
            <button
              type="button"
              onClick={() => navigate(successRedirect)}
              className="mt-6 inline-flex items-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              View Results
            </button>
          )}
        </div>
      </div>
    );
  }

  // Main survey view
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          {backUrl && (
            <button
              type="button"
              onClick={() => navigate(backUrl)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          )}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{completionPct}% complete</span>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-indigo-500 transition-[width] duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Survey content */}
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{survey.title}</h1>
          {survey.description && (
            <p className="mt-2 text-gray-600">{survey.description}</p>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-12">
          {questionsForRender.map(({ question, index, section, showSectionHeader }) => (
            <div
              key={question.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4">
                {showSectionHeader && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
                    {section}
                  </p>
                )}
                <span className="text-sm font-medium text-indigo-600">
                  Question {index + 1} of {totalQuestions}
                  {question.is_required && <span className="ml-1 text-red-500">*</span>}
                </span>
                <h2 className="mt-1 text-lg font-semibold text-gray-900">
                  {question.question_text}
                </h2>
              </div>

              <QuestionRenderer
                question={question}
                value={answers[question.id] ?? null}
                onChange={(value) => handleAnswerChange(question.id, value)}
              />
            </div>
          ))}
        </div>

        {/* Submit section */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          {submitError && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-center text-sm text-red-600">
              {submitError}
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!requiredComplete || submitting}
              className="inline-flex items-center rounded-full bg-indigo-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {submitting ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </>
              ) : (
                "Submit Survey"
              )}
            </button>

            {!requiredComplete && (
              <p className="text-sm text-gray-500">
                Please answer all required questions to submit.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
