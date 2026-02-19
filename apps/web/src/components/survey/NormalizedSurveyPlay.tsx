"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useNormalizedSurvey } from "@/hooks/useNormalizedSurvey";
import QuestionRenderer from "./QuestionRenderer";
import type { AnswerInput } from "@/lib/surveys/normalized-types";
import { getUiVariant, isQuestionComplete } from "./isQuestionComplete";
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
  const submitSectionRef = React.useRef<HTMLDivElement | null>(null);
  const submitButtonRef = React.useRef<HTMLButtonElement | null>(null);

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

  const hasAnyAnswer = React.useCallback((value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number") return Number.isFinite(value);
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
    return false;
  }, []);

  const scrollToNextQuestion = React.useCallback((questionId: string) => {
    if (typeof document === "undefined") return;
    const escapedQuestionId = typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(questionId)
      : questionId.replace(/"/g, '\\"');
    const currentCard = document.querySelector<HTMLElement>(
      `[data-survey-question-card][data-survey-question-id="${escapedQuestionId}"]`,
    );
    const nextCard = currentCard?.nextElementSibling as HTMLElement | null;

    if (nextCard?.hasAttribute("data-survey-question-card")) {
      nextCard.scrollIntoView({ behavior: "smooth", block: "start" });
      const focusTarget = nextCard.querySelector<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      );
      focusTarget?.focus({ preventScroll: true });
      return;
    }

    submitSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    submitButtonRef.current?.focus({ preventScroll: true });
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ questionId?: string }>;
      const questionId = customEvent.detail?.questionId;
      if (typeof questionId === "string" && questionId.length > 0) {
        scrollToNextQuestion(questionId);
      }
    };
    window.addEventListener("survey-question-continue", handler);
    return () => window.removeEventListener("survey-question-continue", handler);
  }, [scrollToNextQuestion]);

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
        <div className="mx-auto flex max-w-4xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          {backUrl && (
            <button
              type="button"
              onClick={() => navigate(backUrl)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          )}
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-xs text-gray-500 sm:text-sm">{completionPct}% complete</span>
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
      <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
        {/* Title */}
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{survey.title}</h1>
          {survey.description && (
            <p className="mt-2 text-sm text-gray-600 sm:text-base">{survey.description}</p>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-6 sm:space-y-8 lg:space-y-12">
          {questionsForRender.map(({ question, index, section, showSectionHeader }) => (
            <div
              key={question.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
              data-survey-question-card
              data-survey-question-id={question.id}
            >
              <div className="mb-3 sm:mb-4">
                {showSectionHeader && (
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 sm:text-xs sm:tracking-[0.3em]">
                    {section}
                  </p>
                )}
                <span className="text-xs font-medium text-indigo-600 sm:text-sm">
                  Question {index + 1} of {totalQuestions}
                  {question.is_required && <span className="ml-1 text-red-500">*</span>}
                </span>
                <h2 className="mt-1 text-base font-semibold leading-snug text-gray-900 sm:text-lg">
                  {question.question_text}
                </h2>
              </div>

              <QuestionRenderer
                question={question}
                value={answers[question.id] ?? null}
                onChange={(value) => handleAnswerChange(question.id, value)}
              />
              {(() => {
                const uiVariant = getUiVariant(question);
                const hasInlineContinue =
                  uiVariant === "agree-likert-scale" ||
                  uiVariant === "cast-decision-card" ||
                  uiVariant === "three-choice-slider";
                const shouldShowContinue =
                  !hasInlineContinue &&
                  hasAnyAnswer(answers[question.id]) &&
                  !submitting;

                if (!shouldShowContinue) return null;

                return (
                  <div className="mt-4 flex justify-center sm:mt-5">
                    <button
                      type="button"
                      onClick={() => scrollToNextQuestion(question.id)}
                      className="inline-flex items-center justify-center rounded-full bg-[#121212] px-7 py-2.5 text-base font-semibold text-[#F8F8F8] transition hover:bg-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/30 sm:px-9 sm:py-3"
                      data-testid={`survey-question-continue-${question.id}`}
                    >
                      Continue
                    </button>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Submit section */}
        <div ref={submitSectionRef} className="mt-8 border-t border-gray-200 pt-6 sm:mt-12 sm:pt-8">
          {submitError && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-center text-sm text-red-600">
              {submitError}
            </div>
          )}

          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <button
              ref={submitButtonRef}
              type="button"
              onClick={handleSubmit}
              disabled={!requiredComplete || submitting}
              className="inline-flex items-center rounded-full bg-indigo-600 px-6 py-2.5 text-base font-semibold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:px-8 sm:py-3 sm:text-lg"
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
